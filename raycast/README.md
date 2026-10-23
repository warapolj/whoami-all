# CLI Accounts

See which account every CLI on your Mac is logged in as, and switch with one keystroke. Powered by [whoami-all](https://github.com/warapolj/whoami-all).

## Commands

### Who Am I

Lists every CLI (GitHub, Git, Cloudflare, npm, Docker, Kubernetes, Tailscale, AWS, Google Cloud, Azure, Vercel, Netlify, Fly.io, Heroku, Railway, DigitalOcean, Firebase, Claude Code, Codex, Gemini CLI, Qwen Code, Ollama, ngrok), grouped by **Logged In**, **Not Logged In** and **Needs Attention**.

| Action | Shortcut |
|---|---|
| Copy account | `↵` |
| Switch account (gh, kubectl, Tailscale, gcloud: uses the CLI's own switcher, no browser) | `⌘ ⇧ S` |
| Probe account (ngrok, Ollama: needs a temporary tunnel or server, so it only runs when you ask) | `⌘ ⇧ P` |
| Run a login command in Terminal or iTerm | from the action panel |
| Copy a command | from the action panel |
| Refresh | `⌘ R` |

### CLI Accounts in Menu Bar

Shows the current account of one CLI (GitHub by default; change it in the command's preferences) in the menu bar, with every other login and quick switching in the menu. It refreshes every 15 minutes.

## Privacy

The extension runs a bundled copy of the open source [`whoami-all`](https://github.com/warapolj/whoami-all/blob/main/whoami-all) script, which only calls each CLI's own `whoami` / `status` command. It never reads, prints, stores or sends tokens, and nothing leaves your Mac except the CLIs' own status calls.

## Preferences

- **whoami-all Script**: use your own copy of the script instead of the bundled one, for example `~/.local/bin/whoami-all`
- **Terminal**: Terminal or iTerm, used for login commands
- **Not Installed**: also list CLIs that aren't installed

## Notes

- Raycast doesn't inherit your shell's environment, so **AI API Keys** (which only reports environment variable names) usually shows none here. Run `whoami-all ai-keys` in your terminal to check your shell.
- CLIs installed in unusual places may not be found. Homebrew, `/usr/local/bin` and `~/.local/bin` are searched automatically.
