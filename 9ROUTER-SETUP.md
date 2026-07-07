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

## Manual control

```bash
# start (same command the hook uses)
9router --tray --no-browser --skip-update --host 127.0.0.1 --log

# stop
pkill -f "9router --tray"
```

Once this is merged into the default branch, every new session picks up the hook automatically.
