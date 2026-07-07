#!/usr/bin/env bash
#
# firecrawl.sh — fetch live web data via the Firecrawl API.
#
# Gives OpenClaw / Ollama agents read access to the web: scrape a single URL to
# clean markdown, or run a web search and get back results.
#
# Auth: reads the API key from $FIRECRAWL_API_KEY (never hardcode it).
#   export FIRECRAWL_API_KEY="fc-..."
#
# Usage:
#   firecrawl.sh scrape <url> [--format markdown|html|links]
#   firecrawl.sh search "<query>" [--limit N]
#
# Examples:
#   firecrawl.sh scrape https://firecrawl.dev
#   firecrawl.sh scrape example.com --format html
#   firecrawl.sh search "best open source LLM 2026" --limit 5
#
# Requires: curl, and (optionally) jq for prettier output.
set -euo pipefail

API_BASE="${FIRECRAWL_API_BASE:-https://api.firecrawl.dev/v2}"

die() { echo "firecrawl: $*" >&2; exit 1; }

cmd="${1:-}"; shift || true

# Help works without credentials; every other command needs the key + curl.
if [[ -z "$cmd" || "$cmd" == "-h" || "$cmd" == "--help" || "$cmd" == "help" ]]; then
  grep '^#' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi
[[ -n "${FIRECRAWL_API_KEY:-}" ]] || die "FIRECRAWL_API_KEY is not set. Run: export FIRECRAWL_API_KEY=fc-..."
command -v curl >/dev/null 2>&1 || die "curl is required but not installed."

case "$cmd" in
  scrape)
    url="${1:-}"; shift || true
    [[ -n "$url" ]] || die "usage: firecrawl.sh scrape <url> [--format markdown|html|links]"
    format="markdown"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --format) format="${2:?--format needs a value}"; shift 2 ;;
        *) die "unknown option: $1" ;;
      esac
    done
    payload=$(printf '{"url":"%s","formats":["%s"]}' "$url" "$format")
    endpoint="$API_BASE/scrape"
    ;;
  search)
    query="${1:-}"; shift || true
    [[ -n "$query" ]] || die "usage: firecrawl.sh search \"<query>\" [--limit N]"
    limit=5
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --limit) limit="${2:?--limit needs a value}"; shift 2 ;;
        *) die "unknown option: $1" ;;
      esac
    done
    # Escape double quotes in the query for JSON safety.
    q_escaped=${query//\"/\\\"}
    payload=$(printf '{"query":"%s","limit":%s}' "$q_escaped" "$limit")
    endpoint="$API_BASE/search"
    ;;
  *)
    die "unknown command '$cmd'. Try: scrape, search, or --help"
    ;;
esac

response=$(curl -sS -X POST "$endpoint" \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$payload")

if command -v jq >/dev/null 2>&1; then
  echo "$response" | jq .
else
  echo "$response"
fi
