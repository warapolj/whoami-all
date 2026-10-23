import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  Check,
  parseHints,
  PROBE_TOOLS,
  runCommand,
  runInTerminal,
  runWhoami,
  STATUS,
  Status,
  switchTargets,
  toolIcon,
  toolTitle,
  toolUrl,
} from "./lib/whoami";

const SECTIONS: { status: Status[]; title: string }[] = [
  { status: ["ok"], title: "Logged In" },
  { status: ["none"], title: "Not Logged In" },
  { status: ["error", "skip"], title: "Needs Attention" },
  { status: ["missing"], title: "Not Installed" },
];

export default function Command() {
  const { showMissing } = getPreferenceValues<Preferences>();
  const {
    data = [],
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(() => runWhoami(), [], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't run whoami-all" });
    },
  });
  const [probing, setProbing] = useState<string>();

  async function probe(tool: string) {
    setProbing(tool);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Probing ${toolTitle(tool)}…` });
    try {
      const [fresh] = await runWhoami(["--probe", tool]);
      // Patch just this row. A full refresh would undo it for ollama, whose
      // temporary server is gone again by then.
      await mutate(undefined, {
        optimisticUpdate: (checks = []) => checks.map((c) => (c.tool === tool && fresh ? fresh : c)),
        shouldRevalidateAfter: false,
      });
      toast.style = fresh?.status === "ok" ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = fresh?.status === "ok" ? fresh.account : `${toolTitle(tool)}: ${fresh?.account || "probe failed"}`;
    } catch (error) {
      await showFailureToast(error, { title: `Couldn't probe ${toolTitle(tool)}` });
    } finally {
      setProbing(undefined);
    }
  }

  async function switchTo(title: string, argv: string[]) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Switching to ${title}…` });
    try {
      await runCommand(argv);
      toast.style = Toast.Style.Success;
      toast.title = `Switched to ${title}`;
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: `Couldn't switch to ${title}` });
    }
  }

  const sections = SECTIONS.filter((s) => showMissing || !s.status.includes("missing"));

  return (
    <List isLoading={isLoading || probing !== undefined} searchBarPlaceholder="Filter by tool or account">
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {data
            .filter((c) => section.status.includes(c.status))
            .map((check) => (
              <CheckItem key={check.tool} check={check} onRefresh={revalidate} onProbe={probe} onSwitch={switchTo} />
            ))}
        </List.Section>
      ))}
      {!isLoading && data.length === 0 && (
        <List.EmptyView icon={Icon.Person} title="No results" description="whoami-all returned nothing." />
      )}
    </List>
  );
}

function CheckItem(props: {
  check: Check;
  onRefresh: () => void;
  onProbe: (tool: string) => void;
  onSwitch: (title: string, argv: string[]) => void;
}) {
  const { check, onRefresh, onProbe, onSwitch } = props;
  const status = STATUS[check.status];
  const hints = parseHints(check.switch);
  const targets = switchTargets(check);
  const url = toolUrl(check.tool);
  const subtitle = check.status === "ok" || check.status === "error" ? check.account : "";

  return (
    <List.Item
      icon={toolIcon(check.tool)}
      title={toolTitle(check.tool)}
      subtitle={subtitle}
      keywords={[check.tool, ...check.account.split(/[\s,()<>[\]*]+/).filter(Boolean)]}
      accessories={[
        ...(targets.length ? [{ icon: Icon.Switch, tooltip: `${targets.length} other account(s)` }] : []),
        { tag: { value: status.label, color: status.color } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {check.account && check.status === "ok" && (
              <Action.CopyToClipboard title="Copy Account" content={check.account} />
            )}
            {targets.length > 0 && (
              <ActionPanel.Submenu
                title="Switch Account"
                icon={Icon.Switch}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
              >
                {targets.map((t) => (
                  <Action key={t.title} title={t.title} onAction={() => onSwitch(t.title, t.argv)} />
                ))}
              </ActionPanel.Submenu>
            )}
            {PROBE_TOOLS.has(check.tool) && (
              <Action
                title="Probe Account"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => onProbe(check.tool)}
              />
            )}
          </ActionPanel.Section>
          {hints.length > 0 && (
            <ActionPanel.Section title="Commands">
              {hints.map((h) =>
                h.runnable ? (
                  <Action
                    key={h.command}
                    title={`Run "${h.command}"`}
                    icon={Icon.Terminal}
                    onAction={async () => {
                      try {
                        await runInTerminal(h.command);
                      } catch (error) {
                        await Clipboard.copy(h.command);
                        await showFailureToast(error, { title: "Couldn't open the terminal; command copied" });
                      }
                    }}
                  />
                ) : null,
              )}
              {hints.map((h) => (
                <Action
                  key={`copy-${h.command}`}
                  title={`Copy "${h.command}"`}
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(h.command);
                    await showHUD("Copied to clipboard");
                  }}
                />
              ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {url && <Action.OpenInBrowser title={`Open ${toolTitle(check.tool)}`} url={url} />}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
