# External AI Tool Integrations

This directory documents how to install, configure, and run three external
open-source AI tools alongside G0DM0D3. Each guide reflects an install that was
actually performed and verified in a Linux container (Ubuntu 24.04, Node 22,
Python 3.11).

| Tool | What it is | Guide |
|------|-----------|-------|
| **AgentGPT** (`reworkd/AgentGPT`) | Autonomous browser-based AI agent that breaks a goal into tasks and executes them in a loop | [AgentGPT.md](./AgentGPT.md) |
| **AgenticSeek** (`Fosowl/agenticSeek`) | 100% local, private "Manus alternative" — web browsing, coding, and task planning with local LLMs for near-zero token cost | [agenticSeek.md](./agenticSeek.md) |
| **ACE** (`ajaxorg/ace`) | Browser-based source-code editor (the editor behind Cloud9 IDE) — an embeddable UI component | [ACE.md](./ACE.md) |

## Quick start

```bash
# From the repo root
./scripts/install-integrations.sh          # clones + installs all three
./scripts/install-integrations.sh agentgpt # or one at a time
```

## Important clarification about ACE

ACE (`ajaxorg/ace`) is a **code editor widget**, not an AI agent and not a
computer/mouse-control tool. It renders an editable, syntax-highlighted text
area in a web page. It cannot control your computer, move your mouse, or run
tasks on its own.

If what you want is **AI agents that control your computer** (mouse, keyboard,
screen), the tools that actually do that are:

- **AgenticSeek** (in this folder) — runs shell commands and drives a real
  browser autonomously, all locally.
- **AgentGPT** (in this folder) — autonomous goal→task execution loop.
- Anthropic **Computer Use** / **Claude in Chrome**, or open-source projects
  such as `OpenInterpreter`, `Self-Operating-Computer`, or `Skyvern` for
  screen/mouse control specifically.

ACE is included here because it is genuinely useful as the **code-editing
surface** inside a chat UI like G0DM0D3 (e.g. an editable code block, a prompt
editor, or a settings/JSON editor). See [ACE.md](./ACE.md) for a working embed.
