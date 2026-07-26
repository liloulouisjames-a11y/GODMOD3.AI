# Agent tooling

Five upstream projects wired into this repo. Everything here is configuration
plus one vendored MCP server — the two large frameworks are cloned on demand.

| What | Source | How it's installed | Where |
| --- | --- | --- | --- |
| WhatsApp MCP server | `Zaibipk/whatsapp-mcp` | vendored + built | `tools/mcp/whatsapp-mcp`, registered in `.mcp.json` |
| Codex plugin | `openai/codex-plugin-cc` | plugin marketplace | `.claude/settings.json` |
| Claude skills bundles | `alirezarezvani/claude-skills` | plugin marketplace | `.claude/settings.json` |
| Composio skills | `ComposioHQ/awesome-claude-skills` | curated copy + fetch script | `.claude/skills`, `tools/skills/add-composio-skill.sh` |
| GenericAgent | `lsdefine/GenericAgent` | clone + venv script | `tools/genericagent/install.sh` |

After cloning this repo, run:

```bash
(cd tools/mcp/whatsapp-mcp && npm install && npm run build)   # WhatsApp MCP
./tools/genericagent/install.sh                                # optional
```

Plugins and skills need no setup step — Claude Code fetches the marketplaces
declared in `.claude/settings.json` on first run.

---

## 1. WhatsApp MCP server

Exposes **50 tools** to Claude: `whatsapp_send_message`, `whatsapp_get_messages`,
`whatsapp_get_chats`, `whatsapp_send_buttons`, `whatsapp_send_list`,
`whatsapp_send_image`, group management, contacts, profile, and status posting.
That covers the customer-conversation and sales flow: read incoming chats, reply,
send catalogues/images, and push button or list menus for product selection.

It talks to WhatsApp through [Baileys](https://github.com/WhiskeySockets/Baileys),
which links a **real WhatsApp account as a companion device** — the same
mechanism as WhatsApp Web, not the official WhatsApp Business Cloud API.

### First-time login

The server needs a one-off QR scan, and the resulting session must live on the
machine that runs Claude Code:

```bash
cd tools/mcp/whatsapp-mcp
AUTH_DIR=./auth_info_baileys node dist/index.js   # prints a QR code
```

Scan it from **WhatsApp → Settings → Linked devices → Link a device**. Credentials
land in `auth_info_baileys/`, and the server reuses them on every later start.
Once linked, `whatsapp_get_connection_status` should report a connected session.

`auth_info_baileys/` is gitignored and must stay that way — anyone holding it can
send messages as your account.

### Registration

`.mcp.json` uses a path relative to the project root:

```json
"args": ["tools/mcp/whatsapp-mcp/dist/index.js"]
```

Relative rather than `${CLAUDE_PROJECT_DIR}` on purpose: Claude Code expands
`${VAR}` in `.mcp.json` from the ambient environment only, and
`CLAUDE_PROJECT_DIR` is not set there. Using it makes the server fail to start
with *"Missing environment variables: CLAUDE_PROJECT_DIR"*. The relative path
resolves against the session's working directory, so start Claude Code from the
repo root. If you need to launch from elsewhere, switch `.mcp.json` to absolute
paths.

Project-scoped MCP servers require approval on first use — Claude Code will
prompt, or you can pre-approve with `claude mcp list`.

### Before selling through it

WhatsApp's terms restrict automated and bulk messaging on regular accounts, and
unsolicited outreach gets numbers banned. Use it to answer people who messaged
you first, and check whether your use case belongs on the official WhatsApp
Business Platform instead.

## 2. Codex plugin (`openai/codex-plugin-cc`)

Adds `/codex:review`, `/codex:adversarial-review`, `/codex:rescue`,
`/codex:transfer`, `/codex:status`, `/codex:result`, `/codex:cancel`, and the
`codex-rescue` subagent — 11 skills total.

Requires the Codex CLI and an OpenAI login, which are **not** installed here:

```bash
npm install -g @openai/codex
codex login          # ChatGPT subscription (incl. Free) or an API key
```

Then run `/codex:setup` inside Claude Code to confirm it's wired up.

## 3. Claude skills bundles (`alirezarezvani/claude-skills`)

The marketplace ships ~90 plugins. Three are enabled, chosen for the
sell-over-WhatsApp goal:

- **business-growth-skills** (5 skills) — customer success, sales engineering,
  revenue operations, contract & proposal writing
- **commercial-skills** (17 skills) — pricing strategy, deal desk, partnerships,
  channel economics, RFP responses, forecasting
- **marketing-skills** (47 skills) — copywriting, SEO/AEO, CRO, email sequences,
  cold email, paid ads, launch strategy

Browse and enable the rest with `/plugin`, or:

```bash
claude plugin install <name>@claude-code-skills --scope project
```

The remaining bundles cover C-level advisory, engineering, product, project
management, finance, research, and compliance.

## 4. Composio skills (`ComposioHQ/awesome-claude-skills`)

That repo holds **864 skills**. Skill names and descriptions are loaded on every
turn, so installing all of them would swamp the context window. Seven are
installed in `.claude/skills`:

`lead-research-assistant`, `competitive-ads-extractor`, `content-research-writer`,
`invoice-organizer`, `meeting-insights-analyzer`, `internal-comms`, `connect`

Add any of the other 857 one at a time:

```bash
./tools/skills/add-composio-skill.sh --list crm      # search
./tools/skills/add-composio-skill.sh attio-automation
```

Skills already available as Claude Code built-ins (`skill-creator`, `mcp-builder`,
`brand-guidelines`, `slack-gif-creator`) were deliberately skipped to avoid
duplicate names competing to trigger.

## 5. GenericAgent (`lsdefine/GenericAgent`)

A standalone self-evolving agent framework — **not** an MCP server and not a
Claude Code plugin. It runs as its own process and takes direct control of a
browser, terminal, filesystem, keyboard/mouse, screen, and Android devices over
ADB, crystallising each solved task into a reusable skill.

```bash
./tools/genericagent/install.sh          # core deps
./tools/genericagent/install.sh --ui     # + GUI/TUI extras
```

The clone lands in `tools/genericagent/src` (gitignored, ~55MB). Add an LLM API
key to `src/mykey.py`, then:

```bash
source tools/genericagent/src/.venv/bin/activate
ga --help                                # ga gui | web | tui | pet
python tools/genericagent/src/agentmain.py
```

Python 3.10–3.13 only; 3.14 breaks `pywebview`. The GUI frontends need a display,
so on a headless box stick to `agentmain.py` or the CLI. Because it drives the
real desktop and shells out freely, run it against work you can afford to have it
touch.
