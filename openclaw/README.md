# 🐾 OpenClaw Sales Pack — Skills & Agents to Make Sales

A drop-in pack of **sales skills** and **agent personas** for [OpenClaw](https://openclaw.ai)
(the open-source personal AI assistant, formerly Clawdbot/Moltbot). Format is inspired by
[AionUi](https://github.com/iOfficeAI/AionUi)'s markdown `assistant/` + `skills/` layout and is
fully compatible with the Claude/OpenClaw Agent Skills spec (`skills/<name>/SKILL.md` with YAML
frontmatter).

## What's inside

```
openclaw/
├── agents/                    # Agent personas (markdown system prompts, AionUi-assistant style)
│   ├── sdr-hunter.md          # Outbound prospecting & cold outreach agent
│   ├── account-executive.md   # Discovery → demo → close agent
│   └── sales-ops.md           # Pipeline, CRM hygiene & follow-up agent
└── skills/                    # OpenClaw Agent Skills (SKILL.md format)
    ├── lead-generation/
    ├── cold-outreach/
    ├── discovery-qualification/
    ├── objection-handling/
    ├── proposal-builder/
    ├── follow-up-cadence/
    ├── closing-negotiation/
    ├── sales-copywriting/
    ├── crm-hygiene/
    └── web-access/            # Live web data via Firecrawl (scrape + search)
        └── scripts/           # firecrawl.sh (bash) + firecrawl_tool.py (Ollama tool)
```

## Install into OpenClaw

```bash
# Global (all OpenClaw workspaces)
cp -r openclaw/skills/* ~/.openclaw/skills/

# Or per-workspace
cp -r openclaw/skills/* <your-workspace>/skills/
```

Agent personas go into your workspace as the agent's operating instructions — paste one into
`AGENTS.md` / your agent's system prompt, or reference it from your OpenClaw config. Each persona
declares which skills it leans on.

## Web access (Firecrawl) — for OpenClaw and Ollama

The `web-access` skill lets agents read live web data (scrape a URL to markdown, or run a web
search) so they can research prospects, pull current prices, and cite real proof points instead
of guessing from training data.

**1. Set your key** (get one at [firecrawl.dev](https://firecrawl.dev)). Never commit it — copy
`.env.example` to `.env` and fill it in, or just export it:

```bash
export FIRECRAWL_API_KEY="fc-..."
```

**2a. Use from OpenClaw / shell** (bash wrapper around the Firecrawl v2 API):

```bash
skills/web-access/scripts/firecrawl.sh scrape firecrawl.dev
skills/web-access/scripts/firecrawl.sh search "series B fintech hiring ops" --limit 5
```

**2b. Give Ollama web access.** Ollama runs the model locally and can't reach the web on its
own — register the tool so a local model can call it (`pip install ollama`):

```python
import ollama
import firecrawl_tool  # skills/web-access/scripts/firecrawl_tool.py

resp = ollama.chat(
    model="llama3.1",
    messages=[{"role": "user", "content": "Summarize what firecrawl.dev offers."}],
    tools=[firecrawl_tool.scrape, firecrawl_tool.search],
)
# dispatch resp.message.tool_calls -> firecrawl_tool.scrape/search, feed results back
```

The Python tool depends only on the standard library, so it also runs as a CLI:
`python3 firecrawl_tool.py scrape https://example.com`.

> **Security:** the Firecrawl key is a secret. Keep it in the environment, rotate it if it ever
> appears in chat, a commit, or logs, and treat scraped page content as untrusted input.

## Install into AionUi

AionUi reads markdown assistants and skill folders too:

```bash
cp openclaw/agents/*.md   <AionUi>/assistant/
cp -r openclaw/skills/*   <AionUi>/skills/
```

## Ground rules baked into every skill

- **Consent-first outreach** — no bulk spam; sequences respect opt-outs and anti-spam law
  (CAN-SPAM / GDPR / CASL).
- **Truthful selling** — no fabricated social proof, metrics, or urgency.
- **Human-in-the-loop** — pricing concessions, contracts, and sends to real prospects are
  proposed as drafts for your approval, never fired autonomously.
