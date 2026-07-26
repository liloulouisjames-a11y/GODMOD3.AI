#!/usr/bin/env bash
# Install lsdefine/GenericAgent into tools/genericagent/src.
#
# GenericAgent is a standalone self-evolving agent framework, not an MCP server
# and not a Claude Code plugin — it runs as its own process and drives a real
# browser/terminal/desktop. It is cloned rather than vendored (the upstream repo
# is ~55MB, mostly assets) and tools/genericagent/src is gitignored.
#
#   ./tools/genericagent/install.sh          # core deps only
#   ./tools/genericagent/install.sh --ui     # + GUI/TUI extras (needs a display)
set -euo pipefail

REPO="https://github.com/lsdefine/GenericAgent.git"
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/src"

EXTRAS=""
[ "${1:-}" = "--ui" ] && EXTRAS="[ui]"

if ! command -v uv >/dev/null 2>&1; then
  echo "error: uv is required (https://docs.astral.sh/uv/getting-started/installation/)" >&2
  exit 1
fi

# Upstream requires Python >=3.10,<3.14; 3.14 breaks pywebview and other deps.
PY=3.12

if [ -d "$SRC/.git" ]; then
  echo "==> updating existing clone"
  git -C "$SRC" pull --ff-only
else
  echo "==> cloning GenericAgent"
  git clone --depth 1 "$REPO" "$SRC"
fi

echo "==> creating venv (python $PY)"
uv venv --python "$PY" "$SRC/.venv"

echo "==> installing genericagent${EXTRAS:+ with extras $EXTRAS}"
VIRTUAL_ENV="$SRC/.venv" uv pip install -e "$SRC$EXTRAS"

# mykey.py holds the LLM API credentials GenericAgent reads at startup.
if [ ! -f "$SRC/mykey.py" ]; then
  cp "$SRC/mykey_template_en.py" "$SRC/mykey.py"
  echo "==> created src/mykey.py from template — add your LLM API key before running"
fi

cat <<EOF

GenericAgent installed at tools/genericagent/src

  1. Add your LLM API key to  tools/genericagent/src/mykey.py
  2. Activate:   source tools/genericagent/src/.venv/bin/activate
  3. Run:        ga --help            (CLI)
                 python tools/genericagent/src/agentmain.py   (headless agent loop)
                 python tools/genericagent/src/launch.pyw     (desktop GUI, needs --ui + a display)

mykey.py is gitignored — it holds live credentials, never commit it.
EOF
