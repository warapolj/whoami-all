# AGENTS.md

Guidance for AI coding agents (and humans) working on this repo.

## What this is

`whoami-all` is a single Bash script that reports which account each CLI on the machine is logged in as (gh, git, wrangler, npm, docker, kubectl, aws, ...) and how to switch it. See `README.md` for user-facing docs.

## Layout

- `whoami-all`: the whole tool. Sections, in order: option parsing → helpers (`have`, `run`, `emit`) → one `check_<tool>` function per tool → parallel runner → output (table or `--json`).
- `.shellcheckrc`: lint config. `check_*` functions are called indirectly, so SC2329 is disabled.
- `.github/workflows/ci.yml`: shellcheck plus smoke tests on macOS and Linux.

## Hard rules

1. **Never print, store, log or send credentials.** A check may only:
   - call the CLI's own whoami/status/list command (or its local API, like Ollama's `/api/me`)
   - test whether a config key or file exists (for example `grep -q authtoken`)
   - read one named, non-secret field (an email, an auth type) from a settings file with `json_field` or `sed -n`
   - check whether an environment variable is set, and report only its name

   Never open credential files (`oauth_creds.json`, `credentials`, `*.pem`, ...). Never `cat` a config file. Never print a token, even masked, and strip masked keys out of a CLI's output (see `check_codex`). Never add a `--show-token`-style flag.
2. **Checks with side effects stay opt-in.** Anything that opens a connection beyond a normal API call, starts a process that stays running, or changes state (like the ngrok probe, which opens a tunnel, or the Ollama probe, which starts a local server) must only run under `--probe`, and should cache its result.
3. **Read-only.** `whoami-all` never switches, logs in or logs out. It only prints the command the user can run (the third `emit` field).
4. **Each check prints exactly one line**: `emit <status> <account> <switch-hint>`, where status is `ok | none | missing | skip | error`. Fields are joined with the ASCII unit separator (`$SEP`), not tabs, because `read` collapses repeated tabs and would shift an empty field.
5. **Respect `--no-network`.** If a check needs the network, `emit skip "" ""` when `NO_NETWORK=1`.
6. **Wrap every external command in `run`** (15 s timeout via Perl `alarm`; macOS has no `timeout`). One hanging CLI must never block the others.

## Compatibility

- Must run on the **stock macOS Bash 3.2**: no associative arrays, `mapfile`/`readarray`, `${var,,}`, `|&` or `coproc`.
- Stick to BSD userland flags that also work on GNU (`sed -n`, `sed -E`, `paste -sd`, `tr`). Never use `sed -i` without a suffix argument.
- Runtime dependencies: Bash, Perl, and the standard POSIX tools. Python 3 is used only by `--probe ngrok`. Don't add others.
- Raycast and launchd don't load the user's shell PATH. The script appends `/opt/homebrew/bin`, `/usr/local/bin` and `~/.local/bin` itself. Keep that.

## Adding a tool

1. Write `check_<tool>()`. Use `-` → `_` in the function name (`ssh-github` → `check_ssh_github`).
2. Start with `have <cli> || { emit missing "" ""; return; }`.
3. Prefer machine-readable output (`--json`, `--format`, `-o name`) over scraping human text.
4. Put a short hint in field 3: the native switch command first, then the login fallback, separated by `  |  `.
5. Mark the active account with `*` when the CLI supports several logins.
6. Add the tool to `ALL_TOOLS` and to the **Supported tools** table in `README.md`.
7. If the CLI just prints the username as its last output line, use `check_simple`.

## Testing

There's no test framework. Before you commit, run:

```sh
shellcheck whoami-all
bash -n whoami-all
./whoami-all --no-network                 # must exit 0 and print no tokens
./whoami-all --json | python3 -m json.tool  # must be valid JSON
./whoami-all <your-tool>                  # the tool you changed, logged in and logged out
```

Test both states (logged in / not logged in) for the tool you changed. If you can't test a CLI locally, say so in the PR.

## Style

- Match the existing code: two-space indent, `local` for function variables, short comments that explain *why* rather than *what*.
- Keep it one file. Keep it readable. Users are told to read it before running it.
