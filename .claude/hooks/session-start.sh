#!/bin/bash
set -euo pipefail

# SessionStart hook: install and start 9router (https://github.com/decolua/9router)
# so it is always running in Claude Code on the web sessions for this repo.
# 9router serves its dashboard and OpenAI-compatible API at http://127.0.0.1:20128

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PORT=20128
LOG_DIR="${HOME}/.9router"
LOG_FILE="${LOG_DIR}/9router.log"
mkdir -p "$LOG_DIR"

is_up() {
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/" 2>/dev/null
}

# Install globally if missing (idempotent; container caching keeps this fast)
if ! command -v 9router >/dev/null 2>&1; then
  npm install -g 9router
fi

# Start headless (tray/background mode, no browser, local-only bind) if not already up
if ! is_up; then
  setsid nohup 9router --tray --no-browser --skip-update --host 127.0.0.1 --log \
    > "$LOG_FILE" 2>&1 < /dev/null &
fi

# Wait until the router responds (Next.js server can take a while on first boot)
for _ in $(seq 1 60); do
  if is_up; then
    echo "9router is running: dashboard http://127.0.0.1:${PORT} | API http://127.0.0.1:${PORT}/v1"
    exit 0
  fi
  sleep 2
done

echo "Warning: 9router did not respond within 120s; check ${LOG_FILE}" >&2
exit 0
