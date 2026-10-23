import {
  Clipboard,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { runCommand, runWhoami, shortAccount, STATUS, switchTargets, toolIcon, toolTitle } from "./lib/whoami";

export default function Command() {
  const { menuBarTool } = getPreferenceValues<Preferences.MenuBar>();
  // Runs in the background every 15 minutes; the cached result shows instantly in between.
  const {
    data = [],
    isLoading,
    revalidate,
  } = useCachedPromise(() => runWhoami(), [], {
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't run whoami-all" });
    },
  });

  const pinned = data.find((c) => c.tool === menuBarTool && c.status === "ok");
  const loggedIn = data.filter((c) => c.status === "ok");
  const notLoggedIn = data.filter((c) => c.status === "none");

  async function switchTo(title: string, argv: string[]) {
    try {
      await runCommand(argv);
      await showHUD(`Switched to ${title}`);
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: `Couldn't switch to ${title}` });
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={Icon.PersonCircle}
      title={pinned ? shortAccount(pinned) : undefined}
      tooltip="CLI Accounts"
    >
      <MenuBarExtra.Section title="Logged In">
        {loggedIn.map((check) => {
          const targets = switchTargets(check);
          const title = `${toolTitle(check.tool)}: ${shortAccount(check)}`;
          return targets.length > 0 ? (
            <MenuBarExtra.Submenu key={check.tool} icon={toolIcon(check.tool)} title={title}>
              <MenuBarExtra.Item title={check.account} icon={STATUS.ok.icon} onAction={() => copy(check.account)} />
              <MenuBarExtra.Section title="Switch To">
                {targets.map((t) => (
                  <MenuBarExtra.Item key={t.title} title={t.title} onAction={() => switchTo(t.title, t.argv)} />
                ))}
              </MenuBarExtra.Section>
            </MenuBarExtra.Submenu>
          ) : (
            <MenuBarExtra.Item
              key={check.tool}
              icon={toolIcon(check.tool)}
              title={title}
              tooltip={check.account}
              onAction={() => copy(check.account)}
            />
          );
        })}
      </MenuBarExtra.Section>
      {notLoggedIn.length > 0 && (
        <MenuBarExtra.Section title="Not Logged In">
          {notLoggedIn.map((check) => (
            <MenuBarExtra.Item key={check.tool} icon={STATUS.none.icon} title={toolTitle(check.tool)} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Who Am I"
          icon={Icon.List}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launchCommand({ name: "who-am-i", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function copy(text: string) {
  await Clipboard.copy(text);
  await showHUD("Copied to clipboard");
}
