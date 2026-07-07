# 9Router — always running in this repo's sessions

This repo is set up so [9Router](https://github.com/decolua/9router) (a local AI router /
token saver, npm package `9router`) is installed and started automatically at the beginning
of every Claude Code on the web session.

## How it works

- `.claude/settings.json` registers a `SessionStart` hook.
- `.claude/hooks/session-start.sh` runs when a session starts (remote/web sessions only). It:
  1. Installs `9router` globally via npm if it isn't installed yet (idempotent).
  2. Starts it headless (`9router --tray --no-browser --skip-update --host 127.0.0.1 --log`)
     if it isn't already listening on port 20128.
  3. Waits until the server responds before letting the session continue.

## Endpoints

| What | URL |
|---|---|
| Dashboard | `http://127.0.0.1:20128` |
| OpenAI-compatible API | `http://127.0.0.1:20128/v1` |

Logs are written to `~/.9router/9router.log`.

## Provider API keys (no secrets in the repo)

The hook auto-registers upstream providers at session start from environment variables.
Set these in the Claude Code **environment settings** (Settings → Environments → your
environment → environment variables), never in the repo:

| Variable | Provider |
|---|---|
| `XAI_API_KEY` | xAI (Grok) |
| `DEEPSEEK_API_KEY` | DeepSeek |
| `NVIDIA_API_KEY` | NVIDIA NIM (free tier) |
| `NINEROUTER_PASSWORD` | Dashboard password override (default `123456`) |

## Network egress requirement

Claude Code on the web environments restrict outbound traffic by network policy.
For 9router to reach the upstream providers, the environment's network access must
allow these hosts (or be set to unrestricted):

- `api.x.ai`
- `api.deepseek.com`
- `integrate.api.nvidia.com`

Without this, requests fail with `Host not in allowlist`. See
https://code.claude.com/docs/en/claude-code-on-the-web for network policy configuration.

## Using it from AI CLI tools

Create an endpoint key in the dashboard (Keys page), then point your tool at the router,
e.g. for Claude Code:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:20128
export ANTHROPIC_AUTH_TOKEN=<key from dashboard>
# model examples: xai/grok-4, deepseek/deepseek-chat, nvidia/deepseek-ai/deepseek-v4-flash
```

## Manual control

```bash
# start (same command the hook uses)
9router --tray --no-browser --skip-update --host 127.0.0.1 --log

# stop
pkill -f "9router --tray"
```

Once this is merged into the default branch, every new session picks up the hook automatically.
