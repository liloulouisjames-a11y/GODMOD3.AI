#!/usr/bin/env bash
#
# install-integrations.sh — clone + install the external AI tools documented in
# docs/integrations/. Idempotent-ish: re-running re-installs deps but keeps clones.
#
# Usage:
#   ./scripts/install-integrations.sh              # all three
#   ./scripts/install-integrations.sh agentgpt     # AgentGPT only
#   ./scripts/install-integrations.sh agenticseek  # AgenticSeek only (low token cost)
#   ./scripts/install-integrations.sh ace          # ACE editor only
#
# Tools are cloned into $BASE_DIR (default: the parent of this repo).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="${BASE_DIR:-$(dirname "$REPO_ROOT")}"
TARGET="${1:-all}"

log() { printf '\n\033[1;32m[integrations]\033[0m %s\n' "$*"; }

install_agentgpt() {
  log "AgentGPT -> $BASE_DIR/AgentGPT"
  [ -d "$BASE_DIR/AgentGPT" ] || git clone --depth 1 https://github.com/reworkd/AgentGPT.git "$BASE_DIR/AgentGPT"
  cd "$BASE_DIR/AgentGPT"

  # Frontend
  ( cd next && npm ci )

  # Backend (needs MySQL client headers to build mysqlclient)
  ( cd platform
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install .
    ./venv/bin/pip install "lanarky==0.7.16" )   # match langchain 0.0.295

  log "AgentGPT installed. See docs/integrations/AgentGPT.md for .env + run steps."
  log "Tip: set REWORKD_PLATFORM_FF_MOCK_MODE_ENABLED=true to run with zero token cost."
}

install_agenticseek() {
  log "AgenticSeek -> $BASE_DIR/agenticSeek (lowest token cost = local LLM)"
  [ -d "$BASE_DIR/agenticSeek" ] || git clone --depth 1 https://github.com/Fosowl/agenticSeek.git "$BASE_DIR/agenticSeek"
  cd "$BASE_DIR/agenticSeek"

  [ -f .env ] || cp .env.example .env

  # Configure for the cheapest path: a small local Ollama model (zero API tokens).
  python3 - <<'PY'
import configparser, os
c = configparser.ConfigParser()
c.read("config.ini")
c["MAIN"]["is_local"] = "True"
c["MAIN"]["provider_name"] = "ollama"
c["MAIN"]["provider_model"] = "qwen2.5:3b"
with open("config.ini", "w") as f:
    c.write(f)
print("config.ini set to local ollama / qwen2.5:3b")
PY

  # System deps: voice libs + Redis (best-effort; needs apt/root).
  if command -v apt-get >/dev/null; then
    apt-get install -y libportaudio2 libsndfile1 redis-server >/dev/null 2>&1 || true
    (service redis-server start >/dev/null 2>&1 || redis-server --daemonize yes >/dev/null 2>&1) || true
  fi

  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip
  # Anchor torch first so the resolver doesn't backtrack for minutes.
  ./venv/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu "torch==2.4.1" "numpy<2"
  ./venv/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

  log "AgenticSeek installed. Start a local model (ollama) + SearXNG/Redis, then: ./venv/bin/python cli.py"
  log "See docs/integrations/agenticSeek.md for the full cost ladder + run steps."
}

install_ace() {
  log "ACE editor -> $BASE_DIR/ace (source) + examples/ace-editor (prebuilt demo)"
  [ -d "$BASE_DIR/ace" ] || git clone --depth 1 https://github.com/ajaxorg/ace.git "$BASE_DIR/ace"
  ( cd "$BASE_DIR/ace" && npm install --no-audit --no-fund ) || true

  # Prebuilt distribution for the embeddable demo (what you actually ship).
  ( cd "$REPO_ROOT/examples/ace-editor"
    npm install --no-audit --no-fund ace-builds
    ln -sfn node_modules/ace-builds ace-builds )

  log "ACE ready. Demo: (cd examples/ace-editor && python3 -m http.server 8080) then open http://localhost:8080"
  log "Reminder: ACE is a code EDITOR widget, not a computer-control agent. See docs/integrations/ACE.md."
}

case "$TARGET" in
  agentgpt)     install_agentgpt ;;
  agenticseek)  install_agenticseek ;;
  ace)          install_ace ;;
  all)          install_agentgpt; install_agenticseek; install_ace ;;
  *) echo "Unknown target: $TARGET (use: agentgpt | agenticseek | ace | all)"; exit 1 ;;
esac

log "Done."
