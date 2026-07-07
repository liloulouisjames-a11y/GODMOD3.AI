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

# Start Ollama if installed and not already serving (9router routes to it via
# the ollama-local provider on http://localhost:11434)
if command -v ollama >/dev/null 2>&1; then
  if ! curl -s -o /dev/null --max-time 2 http://127.0.0.1:11434/ 2>/dev/null; then
    setsid nohup ollama serve > "${LOG_DIR}/ollama.log" 2>&1 < /dev/null &
  fi
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

provider_exists() { # $1=provider id
  curl -s -b "$COOKIE_JAR" --max-time 10 "${BASE}/api/providers" 2>/dev/null \
    | grep -q "\"provider\":\"$1\""
}

register_provider() { # $1=provider id, $2=api key ("" for no-auth providers), $3=display name
  local provider="$1" key="$2" name="$3"
  provider_exists "$provider" && return 0
  curl -s -b "$COOKIE_JAR" --max-time 15 -X POST "${BASE}/api/providers" \
    -H 'Content-Type: application/json' \
    -d "{\"provider\":\"${provider}\",\"apiKey\":\"${key}\",\"name\":\"${name}\",\"priority\":1}" \
    > /dev/null 2>&1 || true
  echo "9router: registered provider ${provider}"
}

if login; then
  [ -n "${XAI_API_KEY:-}" ]      && register_provider xai      "${XAI_API_KEY}"      "xAI (Grok)"
  [ -n "${DEEPSEEK_API_KEY:-}" ] && register_provider deepseek "${DEEPSEEK_API_KEY}" "DeepSeek"
  [ -n "${NVIDIA_API_KEY:-}" ]   && register_provider nvidia   "${NVIDIA_API_KEY}"   "NVIDIA NIM"
  # Ollama needs no API key; register whenever the binary is present
  command -v ollama >/dev/null 2>&1 && register_provider ollama-local "" "Ollama Local"
else
  echo "9router: dashboard login failed; skipping provider auto-registration" >&2
fi

echo "9router is running: dashboard ${BASE} | API ${BASE}/v1"
exit 0
