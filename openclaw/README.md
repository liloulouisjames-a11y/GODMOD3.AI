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
    └── crm-hygiene/
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
