#!/usr/bin/env bash
# Install one skill from ComposioHQ/awesome-claude-skills into .claude/skills/
#
# That repo ships ~860 skills (832 of them under composio-skills/). Installing all
# of them would put ~860 name+description pairs in front of the model on every
# turn, so this repo vendors only a curated subset. Use this script to pull in
# any of the rest, one at a time.
#
#   ./tools/skills/add-composio-skill.sh --list [filter]
#   ./tools/skills/add-composio-skill.sh stripe-automation
#   ./tools/skills/add-composio-skill.sh canvas-design
set -euo pipefail

REPO="https://github.com/ComposioHQ/awesome-claude-skills.git"
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$ROOT/.claude/skills"
CACHE="${TMPDIR:-/tmp}/awesome-claude-skills-cache"

sync_cache() {
  if [ -d "$CACHE/.git" ]; then
    git -C "$CACHE" fetch --depth 1 -q origin && git -C "$CACHE" reset --hard -q origin/HEAD
  else
    rm -rf "$CACHE"
    git clone --depth 1 -q "$REPO" "$CACHE"
  fi
}

find_skill() {
  # Skills live either at the repo root or under composio-skills/
  for candidate in "$CACHE/$1" "$CACHE/composio-skills/$1"; do
    if [ -f "$candidate/SKILL.md" ]; then printf '%s' "$candidate"; return 0; fi
  done
  return 1
}

sync_cache

if [ "${1:-}" = "--list" ] || [ $# -eq 0 ]; then
  filter="${2:-}"
  (cd "$CACHE" && find . -name SKILL.md -not -path './.git/*' \
     | sed 's|^\./||; s|/SKILL\.md$||; s|^composio-skills/||' | sort) \
    | { [ -n "$filter" ] && grep -i -- "$filter" || cat; }
  exit 0
fi

for name in "$@"; do
  src="$(find_skill "$name")" || { echo "not found: $name (try --list)" >&2; exit 1; }
  if [ -e "$DEST/$name" ]; then
    echo "already installed, skipping: $name"
    continue
  fi
  mkdir -p "$DEST"
  cp -r "$src" "$DEST/$name"
  echo "installed: .claude/skills/$name"
done

echo "Restart Claude Code (or run /reload-plugins) to pick up new skills."
