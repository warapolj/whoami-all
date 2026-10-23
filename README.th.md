# whoami-all

[English](./README.md) | **ไทย** | [简体中文](./README.zh-CN.md)

**CLI แต่ละตัวในเครื่องนี้ล็อกอินเป็นบัญชีไหนอยู่?** รันคำสั่งเดียวก็รู้ พร้อมบอกวิธีสลับบัญชีของแต่ละตัว

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

ถ้าคุณมีทั้งบัญชีส่วนตัว บัญชีงาน และบัญชีของลูกค้า จะลืมได้ง่ายว่าตอนนี้ล็อกอินเป็นใครอยู่ จนกว่าจะ push ขึ้น GitHub ผิดบัญชี หรือ deploy ขึ้น Cloudflare ผิด account CLI แต่ละตัวเก็บการล็อกอินไว้คนละที่ และมีคำสั่ง `whoami` ของตัวเอง บางตัวก็ไม่มีเลย `whoami-all` จะรันทุกตัวพร้อมกันแล้วรวมคำตอบไว้ในตารางเดียว

## ปลอดภัยตั้งแต่การออกแบบ

- รันแค่คำสั่ง `whoami` / `status` / `list` **ของ CLI นั้นๆ เอง** แล้วแสดงผล
- **ไม่แสดง ไม่เก็บ และไม่ส่ง token ไปไหน** credential ยังอยู่ในที่ที่ CLI แต่ละตัวเก็บไว้ บางเครื่องมือไม่มีคำสั่งเช็กสถานะ จึงอ่านแค่ค่าที่ไม่ใช่ความลับหนึ่งค่า (อีเมลหรือประเภทการล็อกอิน) จากไฟล์ settings และไม่เปิดไฟล์ credential เลย
- การเช็กที่มีผลข้างเคียงจะทำก็ต่อเมื่อคุณสั่งเท่านั้น (ดู `--probe`)
- เป็น Bash script ไฟล์เดียวที่อ่านเข้าใจง่าย [อ่านโค้ด](./whoami-all) ก่อนรันได้เลย

## ติดตั้ง

```sh
git clone https://github.com/warapolj/whoami-all.git
ln -s "$PWD/whoami-all/whoami-all" ~/.local/bin/whoami-all   # โฟลเดอร์ไหนก็ได้ที่อยู่ใน PATH
```

หรือดาวน์โหลดแค่ตัว script:

```sh
curl -fsSL https://raw.githubusercontent.com/warapolj/whoami-all/main/whoami-all -o ~/.local/bin/whoami-all
chmod +x ~/.local/bin/whoami-all
```

ต้องการ: macOS หรือ Linux, Bash 3.2 ขึ้นไป, Perl (macOS มีมาให้แล้ว) และ `--probe ngrok` ต้องใช้ Python 3 เพิ่ม

## วิธีใช้

```sh
whoami-all                   # เช็กทุกตัว
whoami-all gh wrangler       # เช็กเฉพาะตัวที่ระบุ
whoami-all --no-network      # ข้ามตัวที่ต้องเรียก API ผ่านเน็ต (เร็ว ใช้ offline ได้)
whoami-all --json            # output สำหรับให้โปรแกรมอื่นอ่าน
whoami-all --probe ngrok     # ดูหัวข้อ "ngrok" ด้านล่าง
whoami-all --probe ollama    # เปิด Ollama server ชั่วคราวในเครื่อง ถ้ายังไม่มีตัวไหนรันอยู่
```

แต่ละการเช็กจะหมดเวลาใน 15 วินาที CLI ตัวไหนช้าหรือค้างจึงไม่ทำให้ตัวอื่นค้างตาม

### Output แบบ JSON

```json
[
  {"tool":"gh","status":"ok","account":"octocat*(github.com)","switch":"gh auth switch  |  add: gh auth login"},
  {"tool":"npm","status":"none","account":"","switch":"npm login"}
]
```

ค่า `status` เป็นได้ 5 แบบ:
- `ok`
- `none` (ติดตั้งแล้วแต่ยังไม่ได้ล็อกอิน)
- `missing` (ไม่ได้ติดตั้ง)
- `skip` (ถูกข้ามเพราะใช้ `--no-network`)
- `error`

## เครื่องมือที่รองรับ

| เครื่องมือ | เช็กด้วยวิธี | การแสดงบัญชีที่ใช้อยู่ |
|---|---|---|
| `gh` | `gh auth status` | `*` = บัญชีที่ใช้อยู่ |
| `git` | `git config --global user.name / user.email` | |
| `ssh-github` | `ssh -T git@github.com` | |
| `wrangler` (Cloudflare) | `wrangler whoami` หรือ `npx wrangler whoami` ถ้าไม่ได้ติดตั้งแบบ global | |
| `npm` | `npm whoami` | |
| `docker` | คำสั่ง `list` ของ credential helper (ได้แค่ registry → username) | |
| `kubectl` | `kubectl config current-context` / `get-contexts` | `current:` |
| `tailscale` | `tailscale switch --list` (คุยกับ tailscaled ในเครื่องเท่านั้น ใช้ได้ทั้งตอน offline และตอนที่ยังไม่ได้เชื่อมต่อ) + `tailscale status --json` สำหรับสถานะการเชื่อมต่อ | `*` = profile ที่ใช้อยู่ |
| `claude` (Claude Code) | `claude auth status --json` | |
| `codex` (OpenAI Codex CLI) | `codex login status` (เก็บแค่คำว่า "ChatGPT" / "an API key" ส่วน key ที่ถูกปิดบังจะถูกตัดทิ้ง) | |
| `gemini` (Gemini CLI) | อีเมลในช่อง `active` ของ `~/.gemini/google_accounts.json` + ประเภทการล็อกอินใน `settings.json` (ไม่เปิด `oauth_creds.json`) | |
| `qwen` (Qwen Code) | ประเภทการล็อกอินใน `~/.qwen/settings.json` | |
| `ollama` | `POST /api/me` ของ Ollama server ในเครื่อง (ถ้าไม่มี server รันอยู่ `--probe` จะเปิด server ชั่วคราวให้) | |
| `ai-keys` | AI API key ตัวไหนถูกตั้งไว้ใน shell บ้าง **แสดงแค่ชื่อตัวแปร** (`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, ...) | |
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
| `ngrok` | ดูด้านล่าง | |

### AI ที่ไม่มีระบบล็อกอิน (DeepSeek, OpenRouter, ...)

DeepSeek และผู้ให้บริการ AI อีกหลายเจ้าไม่มี CLI ทางการสำหรับล็อกอิน เครื่องมืออย่าง aider, `llm` หรือ Continue แค่อ่าน API key จาก environment variable `ai-keys` จะบอกว่าตัวแปรไหนถูกตั้งไว้ใน shell ปัจจุบันบ้าง ทำให้รู้ว่าเครื่องมือจะใช้ key ตัวไหน โดยแสดงแค่ชื่อตัวแปร ไม่แสดงค่า

### ngrok

ngrok ไม่มีคำสั่ง `whoami` ทั้ง log และ local API ก็ไม่มีชื่อ account ชื่อจะขึ้นแค่บนหน้าจอ console ตอนรันแบบ interactive เท่านั้น ค่าเริ่มต้นของ `whoami-all` จึงบอกได้แค่ว่าตั้งค่า authtoken ไว้แล้วหรือยัง

`whoami-all --probe ngrok` ทำงานแบบนี้:
1. เปิด tunnel ชั่วคราวไปที่ local port ที่ไม่มีอะไรรันอยู่ ภายใน pseudo-terminal
2. อ่านบรรทัด `Account` จากหน้าจอ console
3. ปิด tunnel

ใช้เวลาไม่กี่วินาที และระหว่างนั้นจะมี URL สาธารณะเปิดอยู่ชั่วครู่ ผลจะถูกเก็บไว้ใน `~/.cache/whoami-all/ngrok-account` ครั้งต่อไปจะแสดงชื่อจาก cache พร้อมวันที่ที่เช็ก ถ้ามี ngrok agent รันอยู่แล้วจะไม่ probe เพราะแผน Free เปิดได้ทีละ session

## เพิ่มเครื่องมือใหม่

แต่ละเครื่องมือคือฟังก์ชัน `check_<tool>` หนึ่งตัวที่พิมพ์ผลหนึ่งบรรทัดผ่าน `emit <status> <account> <how-to-switch>` แค่เพิ่มฟังก์ชัน แล้วใส่ชื่อเครื่องมือใน `ALL_TOOLS` ก็เสร็จ ถ้า CLI นั้นพิมพ์ username เป็นบรรทัดสุดท้ายของคำสั่ง `whoami` ใช้ `check_simple` ได้เลย:

```bash
check_mytool() { check_simple mytool "mytool logout && mytool login" "mytool login" mytool whoami; }
```

ดูข้อตกลงในการเขียนโค้ดและวิธีทดสอบได้ใน [AGENTS.md](./AGENTS.md) (ภาษาอังกฤษ)

## Roadmap

1. **Script** (repo นี้): ดูทุกบัญชีได้ในที่เดียว ✅
2. **Raycast extension**: หน้ารายการและเมนูบาร์ที่ใช้ `whoami-all --json` พร้อมปุ่มรันคำสั่งสลับบัญชีหรือล็อกอิน
3. **Workspaces**: ไฟล์ `.accounts.toml` ในแต่ละโฟลเดอร์โปรเจกต์ ระบุว่า CLI แต่ละตัวควรใช้บัญชีไหน และมีโหมด `--check` ไว้เตือนเมื่อบัญชีที่ล็อกอินอยู่ไม่ตรง เช่น เรียกจาก git `pre-push` hook

## License

[MIT](./LICENSE)
