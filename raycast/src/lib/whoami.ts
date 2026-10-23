import { environment, getPreferenceValues, Icon, Color, Image } from "@raycast/api";
import { getFavicon, runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type Status = "ok" | "none" | "missing" | "skip" | "error";

export interface Check {
  tool: string;
  status: Status;
  account: string;
  switch: string;
}

/** Raycast doesn't load the login shell PATH, so add the usual install locations. */
export const PATH = [
  process.env.PATH,
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  join(homedir(), ".local/bin"),
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
]
  .filter(Boolean)
  .join(":");

function scriptPath(): string {
  const { scriptPath } = getPreferenceValues<Preferences>();
  if (scriptPath?.trim()) return scriptPath.trim().replace(/^~(?=\/)/, homedir());
  return join(environment.assetsPath, "whoami-all");
}

/** Run `whoami-all --json [args]`. The script always exits 0 and prints one JSON array. */
export async function runWhoami(args: string[] = []): Promise<Check[]> {
  const { stdout } = await execFileAsync("/bin/bash", [scriptPath(), "--json", ...args], {
    timeout: 90_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, PATH },
  });
  return JSON.parse(stdout) as Check[];
}

/** Run a CLI directly (no shell), e.g. `gh auth switch -h github.com -u octocat`. */
export async function runCommand(argv: string[]): Promise<string> {
  const [file, ...args] = argv;
  const { stdout, stderr } = await execFileAsync(file, args, { timeout: 30_000, env: { ...process.env, PATH } });
  return (stdout || stderr).trim();
}

// --- presentation -----------------------------------------------------------

interface ToolInfo {
  title: string;
  url?: string;
}

const TOOLS: Record<string, ToolInfo> = {
  gh: { title: "GitHub CLI", url: "https://github.com" },
  git: { title: "Git", url: "https://git-scm.com" },
  "ssh-github": { title: "GitHub SSH", url: "https://github.com" },
  wrangler: { title: "Cloudflare", url: "https://dash.cloudflare.com" },
  npm: { title: "npm", url: "https://www.npmjs.com" },
  docker: { title: "Docker", url: "https://hub.docker.com" },
  kubectl: { title: "Kubernetes", url: "https://kubernetes.io" },
  tailscale: { title: "Tailscale", url: "https://login.tailscale.com" },
  aws: { title: "AWS", url: "https://aws.amazon.com" },
  gcloud: { title: "Google Cloud", url: "https://console.cloud.google.com" },
  az: { title: "Azure", url: "https://portal.azure.com" },
  vercel: { title: "Vercel", url: "https://vercel.com" },
  netlify: { title: "Netlify", url: "https://app.netlify.com" },
  fly: { title: "Fly.io", url: "https://fly.io" },
  heroku: { title: "Heroku", url: "https://dashboard.heroku.com" },
  railway: { title: "Railway", url: "https://railway.com" },
  doctl: { title: "DigitalOcean", url: "https://cloud.digitalocean.com" },
  firebase: { title: "Firebase", url: "https://console.firebase.google.com" },
  claude: { title: "Claude Code", url: "https://claude.ai" },
  codex: { title: "OpenAI Codex", url: "https://chatgpt.com" },
  gemini: { title: "Gemini CLI", url: "https://gemini.google.com" },
  qwen: { title: "Qwen Code", url: "https://qwen.ai" },
  ollama: { title: "Ollama", url: "https://ollama.com" },
  "ai-keys": { title: "AI API Keys" },
  ngrok: { title: "ngrok", url: "https://dashboard.ngrok.com" },
};

export function toolTitle(tool: string): string {
  return TOOLS[tool]?.title ?? tool;
}

export function toolUrl(tool: string): string | undefined {
  return TOOLS[tool]?.url;
}

export function toolIcon(tool: string): Image.ImageLike {
  const url = TOOLS[tool]?.url;
  return url ? getFavicon(url, { fallback: Icon.Terminal }) : Icon.Key;
}

export const STATUS: Record<Status, { label: string; color: Color; icon: Image.ImageLike }> = {
  ok: { label: "Logged in", color: Color.Green, icon: { source: Icon.CheckCircle, tintColor: Color.Green } },
  none: { label: "Not logged in", color: Color.Orange, icon: { source: Icon.Circle, tintColor: Color.Orange } },
  error: { label: "Error", color: Color.Red, icon: { source: Icon.XMarkCircle, tintColor: Color.Red } },
  skip: { label: "Skipped", color: Color.SecondaryText, icon: Icon.MinusCircle },
  missing: { label: "Not installed", color: Color.SecondaryText, icon: Icon.Download },
};

/** Tools whose account can only be read with `--probe` (it has side effects). */
export const PROBE_TOOLS = new Set(["ngrok", "ollama"]);

/** The short "current account" for a menu bar title: first active entry, without hosts/plans. */
export function shortAccount(check: Check): string {
  const entries = check.account.split(", ");
  const active = entries.find((e) => /\*/.test(e)) ?? entries[0] ?? "";
  const short = active
    .replace(/^current:\s*/, "")
    .replace(/\s*→.*$/, "")
    .replace(/\s*[([<].*$/, "")
    .replace(/\*/g, "")
    .trim();
  return short || check.account;
}

// --- hints and native switching ---------------------------------------------

export interface Hint {
  label?: string;
  command: string;
  runnable: boolean;
}

/** Split the script's switch hint ("gh auth switch  |  add: gh auth login") into commands. */
export function parseHints(hint: string): Hint[] {
  if (!hint) return [];
  return hint
    .split(/\s+\|\s+/)
    .map((part) => {
      const m = part.match(/^(add|connect|other user):\s*(.+)$/);
      const command = (m ? m[2] : part).trim();
      // Only plain commands are runnable; anything with placeholders or prose is copy-only.
      const runnable = /^[\w.-]+( [\w.=@-]+)*( && [\w.-]+( [\w.=@-]+)*)*$/.test(command);
      return { label: m?.[1], command, runnable };
    })
    .filter((h) => h.command.length > 0);
}

export interface SwitchTarget {
  title: string;
  argv: string[];
}

/**
 * Accounts we can switch to without a browser, using the CLI's own switcher.
 * Parsed from the script's human-readable account field.
 */
export function switchTargets(check: Check): SwitchTarget[] {
  if (check.status !== "ok") return [];
  const others = (s: string) =>
    s
      .split(", ")
      .map((e) => e.trim())
      .filter((e) => e && !e.includes("*"));

  switch (check.tool) {
    case "gh":
      // "octocat*(github.com), work(github.com)"
      return others(check.account).flatMap((e) => {
        const m = e.match(/^([^(]+)\(([^)]+)\)$/);
        return m ? [{ title: `${m[1]} (${m[2]})`, argv: ["gh", "auth", "switch", "-h", m[2], "-u", m[1]] }] : [];
      });
    case "kubectl": {
      // "current: prod  (all: dev, staging, prod)"
      const current = check.account.match(/^current:\s*(\S+)/)?.[1];
      const all = check.account.match(/\(all: (.+)\)$/)?.[1]?.split(", ") ?? [];
      return all.filter((c) => c !== current).map((c) => ({ title: c, argv: ["kubectl", "config", "use-context", c] }));
    }
    case "tailscale":
      // "me@example.com* (laptop.ts.net), work.example (laptop.ts.net)  [Running]"
      return others(check.account.replace(/\s+\[[^\]]*\]$/, "")).flatMap((e) => {
        const tailnet = e.replace(/\s*\(.*$/, "");
        return tailnet ? [{ title: e, argv: ["tailscale", "switch", tailnet] }] : [];
      });
    case "gcloud":
      // "me@example.com*, work@example.com (project: my-project)"
      return others(check.account.replace(/\s+\(project:.*\)$/, "")).map((a) => ({
        title: a,
        argv: ["gcloud", "config", "set", "account", a],
      }));
    default:
      return [];
  }
}

// --- terminal ---------------------------------------------------------------

function appleScriptString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Open a new terminal window and run `command` (used for logins that need a browser). */
export async function runInTerminal(command: string): Promise<void> {
  const { terminal } = getPreferenceValues<Preferences>();
  const cmd = appleScriptString(command);
  if (terminal === "iTerm") {
    await runAppleScript(`
      tell application "iTerm"
        activate
        set w to (create window with default profile)
        tell current session of w to write text ${cmd}
      end tell`);
  } else {
    await runAppleScript(`
      tell application "Terminal"
        activate
        do script ${cmd}
      end tell`);
  }
}
