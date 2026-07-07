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
BASE="http://127.0.0.1:${PORT}"
LOG_DIR="${HOME}/.9router"
LOG_FILE="${LOG_DIR}/9router.log"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT
mkdir -p "$LOG_DIR"

is_up() {
  curl -s -o /dev/null --max-time 2 "${BASE}/" 2>/dev/null
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
ready=false
for _ in $(seq 1 60); do
  if is_up; then ready=true; break; fi
  sleep 2
done

if [ "$ready" != "true" ]; then
  echo "Warning: 9router did not respond within 120s; check ${LOG_FILE}" >&2
  exit 0
fi

# --- Auto-register upstream providers from environment variables ---------------
# Set these as environment variables/secrets in the Claude Code environment
# settings (NOT in the repo): XAI_API_KEY, DEEPSEEK_API_KEY, NVIDIA_API_KEY.
# NINEROUTER_PASSWORD overrides the dashboard password (default 123456).

login() {
  curl -s -c "$COOKIE_JAR" --max-time 10 -X POST "${BASE}/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"password\":\"${NINEROUTER_PASSWORD:-123456}\"}" 2>/dev/null | grep -q '"success":true'
}

register_provider() { # $1=provider id, $2=api key, $3=display name
  local provider="$1" key="$2" name="$3"
  [ -n "$key" ] || return 0
  # Skip if a connection for this provider already exists
  if curl -s -b "$COOKIE_JAR" --max-time 10 "${BASE}/api/providers" 2>/dev/null \
      | grep -q "\"provider\":\"${provider}\""; then
    return 0
  fi
  curl -s -b "$COOKIE_JAR" --max-time 15 -X POST "${BASE}/api/providers" \
    -H 'Content-Type: application/json' \
    -d "{\"provider\":\"${provider}\",\"apiKey\":\"${key}\",\"name\":\"${name}\",\"priority\":1}" \
    > /dev/null 2>&1 || true
  echo "9router: registered provider ${provider}"
}

if login; then
  register_provider xai      "${XAI_API_KEY:-}"      "xAI (Grok)"
  register_provider deepseek "${DEEPSEEK_API_KEY:-}" "DeepSeek"
  register_provider nvidia   "${NVIDIA_API_KEY:-}"   "NVIDIA NIM"
else
  echo "9router: dashboard login failed; skipping provider auto-registration" >&2
fi

echo "9router is running: dashboard ${BASE} | API ${BASE}/v1"
exit 0
