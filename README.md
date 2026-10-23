# whoami-all

**English** | [ไทย](./README.th.md) | [简体中文](./README.zh-CN.md)

**Which account is every CLI on this machine logged in as?** One command to find out, plus how to switch each one.

```
$ whoami-all
✓ gh          octocat*(github.com), octocat-work(github.com)
              ↳ gh auth switch  |  add: gh auth login
✓ git         Mona Lisa <mona@example.com> (global)
              ↳ git config --global user.email …  |  per folder: includeIf in ~/.gitconfig
✓ ssh-github  octocat
              ↳ IdentityFile for Host github.com in ~/.ssh/config
✓ wrangler    mona@example.com → Mona's Account [1a2b3c4d…], Acme Corp [5e6f7a8b…]
              ↳ per project: account_id in wrangler.toml  |  other user: wrangler logout && wrangler login
○ npm         not logged in  ↳ npm login
✓ kubectl     current: prod  (all: dev, staging, prod)
              ↳ kubectl config use-context <name>

not installed: gcloud az netlify heroku railway doctl firebase
```

If you juggle personal, work and client accounts, it's easy to forget what you're logged in as, until you push to the wrong GitHub account or deploy to the wrong Cloudflare account. Every CLI stores its login somewhere different and has its own `whoami` command (or none). `whoami-all` runs them all in parallel and puts the answers in one table.

## Safe by design

- It only runs each CLI's **own** `whoami` / `status` / `list` command and shows the result.
- It **never prints, stores or sends tokens**. Your credentials stay where each CLI keeps them. A few tools have no status command, so it reads one non-secret field (an email or an auth type) from their settings file, and never opens their credential files.
- Checks that have side effects run only when you ask for them (see `--probe`).
- It's a single, readable Bash script. [Read it](./whoami-all) before you run it.

## Install

```sh
git clone https://github.com/warapolj/whoami-all.git
ln -s "$PWD/whoami-all/whoami-all" ~/.local/bin/whoami-all   # any directory on your PATH
```

Or just the script:

```sh
curl -fsSL https://raw.githubusercontent.com/warapolj/whoami-all/main/whoami-all -o ~/.local/bin/whoami-all
chmod +x ~/.local/bin/whoami-all
```

Requirements: macOS or Linux, Bash 3.2+, Perl (preinstalled on macOS). `--probe ngrok` also needs Python 3.

## Usage

```sh
whoami-all                   # check everything
whoami-all gh wrangler       # only these tools
whoami-all --no-network      # skip checks that call a remote API (fast, offline)
whoami-all --json            # machine-readable output
whoami-all --probe ngrok     # see "ngrok" below
whoami-all --probe ollama    # start a temporary local Ollama server if none is running
```

Each check times out after 15 seconds, so one slow or hanging CLI can't block the rest.

### JSON output

```json
[
  {"tool":"gh","status":"ok","account":"octocat*(github.com)","switch":"gh auth switch  |  add: gh auth login"},
  {"tool":"npm","status":"none","account":"","switch":"npm login"}
]
```

`status` is one of `ok`, `none` (installed but not logged in), `missing` (not installed), `skip` (skipped by `--no-network`) or `error`.

## Supported tools

| Tool | How it's checked | Marked active |
|---|---|---|
| `gh` | `gh auth status` | `*` = active account |
| `git` | `git config --global user.name / user.email` | |
| `ssh-github` | `ssh -T git@github.com` | |
| `wrangler` (Cloudflare) | `wrangler whoami`, or `npx wrangler whoami` if it's not installed globally | |
| `npm` | `npm whoami` | |
| `docker` | credential helper `list` (registry → username only) | |
| `kubectl` | `kubectl config current-context` / `get-contexts` | `current:` |
| `tailscale` | `tailscale switch --list` (local only, works offline and while disconnected) + `tailscale status --json` for the connection state | `*` = current profile |
| `claude` (Claude Code) | `claude auth status --json` | |
| `codex` (OpenAI Codex CLI) | `codex login status` (only "ChatGPT" / "an API key" is kept; the masked key is dropped) | |
| `gemini` (Gemini CLI) | `active` email in `~/.gemini/google_accounts.json` + auth type in `settings.json` (`oauth_creds.json` is never opened) | |
| `qwen` (Qwen Code) | auth type in `~/.qwen/settings.json` | |
| `ollama` | `POST /api/me` on the local Ollama server (`--probe` starts a temporary server if none is running) | |
| `ai-keys` | which AI API key variables are set in your shell, **names only** (`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, ...) | |
| `aws` | `aws configure list-profiles`, `aws sts get-caller-identity` | `profile=` |
| `gcloud` | `gcloud auth list` | `*` |
| `az` | `az account show` | |
| `vercel` | `vercel whoami` | |
| `netlify` | `netlify status` | |
| `fly` | `fly auth whoami` | |
| `heroku` | `heroku auth:whoami` | |
| `railway` | `railway whoami` | |
| `doctl` | `doctl account get` | |
| `firebase` | `firebase login:list` | |
| `ngrok` | see below | |

### AI tools without a login (DeepSeek, OpenRouter, ...)

DeepSeek and many other AI providers have no official CLI login. Tools like aider, `llm` or Continue just read an API key from an environment variable. `ai-keys` tells you which of those variables are set in the current shell, so you know which key a tool will pick up. It prints the variable names only, never the values.

### ngrok

ngrok has no `whoami`, and neither its log nor its local API includes the account name. The name only shows up in the interactive console. So by default `whoami-all` only tells you whether an authtoken is configured.

`whoami-all --probe ngrok` starts a throwaway tunnel (to an unused local port) inside a pseudo-terminal, reads the `Account` line, then stops the tunnel. This takes a few seconds and briefly opens a public URL. The result is cached in `~/.cache/whoami-all/ngrok-account`, and later runs show the cached name and the date it was checked. It won't probe if an ngrok agent is already running, because the free plan allows one agent session at a time.

## Adding a tool

Each tool is one `check_<tool>` function that prints a single line via `emit <status> <account> <how-to-switch>`. Add the function, add the tool name to `ALL_TOOLS`, and you're done. If the CLI prints the username as the last line of its `whoami` output, `check_simple` does all the work:

```bash
check_mytool() { check_simple mytool "mytool logout && mytool login" "mytool login" mytool whoami; }
```

See [AGENTS.md](./AGENTS.md) for conventions and how to test.

## Roadmap

1. **Script** (this repo): see every account in one place ✅
2. **Raycast extension**: a list and a menu bar command built on `whoami-all --json`, with actions that run the switch/login command
3. **Workspaces**: an `.accounts.toml` per project folder that says which account each CLI should use, plus a `--check` mode that warns (for example, from a git `pre-push` hook) when the current login doesn't match

## License

[MIT](./LICENSE)
