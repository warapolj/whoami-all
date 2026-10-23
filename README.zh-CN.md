# whoami-all

[English](./README.md) | [ไทย](./README.th.md) | **简体中文**

**这台机器上的每个 CLI 当前登录的是哪个账号？** 一条命令就能查清，还会告诉你每个工具怎么切换账号。

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

如果你同时使用个人、公司和客户的账号，很容易忘记当前登录的是哪一个，直到你推送到了错误的 GitHub 账号，或部署到了错误的 Cloudflare 账号。每个 CLI 把登录信息存在不同的地方，各有各的 `whoami` 命令，有的甚至没有。`whoami-all` 会并行运行它们，并把结果汇总到一张表里。

## 设计上就是安全的

- 只运行各个 CLI **自带的** `whoami` / `status` / `list` 命令并显示结果。
- **从不打印、存储或发送 token**。凭据始终保存在各个 CLI 原本存放的位置。
- 有副作用的检查只在你明确要求时才会执行（见 `--probe`）。
- 整个工具就是一个易读的 Bash 脚本，运行前可以先[看一遍](./whoami-all)。

## 安装

```sh
git clone https://github.com/warapolj/whoami-all.git
ln -s "$PWD/whoami-all/whoami-all" ~/.local/bin/whoami-all   # 任意在 PATH 中的目录
```

或者只下载脚本：

```sh
curl -fsSL https://raw.githubusercontent.com/warapolj/whoami-all/main/whoami-all -o ~/.local/bin/whoami-all
chmod +x ~/.local/bin/whoami-all
```

环境要求：macOS 或 Linux、Bash 3.2+、Perl（macOS 自带）。`--probe ngrok` 还需要 Python 3。

## 用法

```sh
whoami-all                   # 检查所有工具
whoami-all gh wrangler       # 只检查指定的工具
whoami-all --no-network      # 跳过需要调用远程 API 的检查（快速，可离线）
whoami-all --json            # 机器可读的输出
whoami-all --probe ngrok     # 见下文 "ngrok"
```

每项检查最多等待 15 秒，某个 CLI 变慢或卡住也不会拖住其他检查。

### JSON 输出

```json
[
  {"tool":"gh","status":"ok","account":"octocat*(github.com)","switch":"gh auth switch  |  add: gh auth login"},
  {"tool":"npm","status":"none","account":"","switch":"npm login"}
]
```

`status` 取值：

| 值 | 含义 |
|---|---|
| `ok` | 已登录 |
| `none` | 已安装但未登录 |
| `missing` | 未安装 |
| `skip` | 因 `--no-network` 被跳过 |
| `error` | 检查失败 |

## 支持的工具

| 工具 | 检查方式 | 当前账号标记 |
|---|---|---|
| `gh` | `gh auth status` | `*` = 当前账号 |
| `git` | `git config --global user.name / user.email` | |
| `ssh-github` | `ssh -T git@github.com` | |
| `wrangler` (Cloudflare) | `wrangler whoami`，未全局安装时用 `npx wrangler whoami` | |
| `npm` | `npm whoami` | |
| `docker` | credential helper 的 `list`（只有 registry → 用户名） | |
| `kubectl` | `kubectl config current-context` / `get-contexts` | `current:` |
| `tailscale` | `tailscale switch --list`（只访问本机 tailscaled，离线或未连接时也可用）+ `tailscale status --json` 获取连接状态 | `*` = 当前 profile |
| `aws` | `aws configure list-profiles`、`aws sts get-caller-identity` | `profile=` |
| `gcloud` | `gcloud auth list` | `*` |
| `az` | `az account show` | |
| `vercel` | `vercel whoami` | |
| `netlify` | `netlify status` | |
| `fly` | `fly auth whoami` | |
| `heroku` | `heroku auth:whoami` | |
| `railway` | `railway whoami` | |
| `doctl` | `doctl account get` | |
| `firebase` | `firebase login:list` | |
| `ngrok` | 见下文 | |

### ngrok

ngrok 没有 `whoami` 命令，它的日志和本地 API 里也都没有账号名，账号名只会出现在交互式控制台界面上。因此默认情况下，`whoami-all` 只告诉你是否已配置 authtoken。

`whoami-all --probe ngrok` 的流程：

1. 在伪终端里启动一个临时隧道，指向一个没有服务在监听的本地端口。
2. 读取控制台上的 `Account` 那一行。
3. 关闭隧道。

整个过程只需几秒，期间会短暂开放一个公网 URL。结果缓存在 `~/.cache/whoami-all/ngrok-account`，之后运行会显示缓存的账号名和检查日期。如果已有 ngrok agent 在运行，则不会执行探测，因为免费版同一时间只允许一个 agent 会话。

## 添加新工具

每个工具对应一个 `check_<tool>` 函数，通过 `emit <status> <account> <how-to-switch>` 输出一行结果。写好函数，再把工具名加到 `ALL_TOOLS` 里就完成了。如果该 CLI 的 `whoami` 输出最后一行就是用户名，直接用 `check_simple` 即可：

```bash
check_mytool() { check_simple mytool "mytool logout && mytool login" "mytool login" mytool whoami; }
```

代码约定和测试方法见 [AGENTS.md](./AGENTS.md)（英文）。

## 路线图

1. **脚本**（本仓库）：在一个地方查看所有账号 ✅
2. **Raycast 扩展**：基于 `whoami-all --json` 的列表和菜单栏命令，可一键运行切换或登录命令
3. **工作区**：每个项目目录下放一个 `.accounts.toml`，声明每个 CLI 应使用的账号，并提供 `--check` 模式，当前登录不匹配时发出警告（例如在 git `pre-push` hook 中使用）

## 许可证

[MIT](./LICENSE)
