#!/usr/bin/env python3
"""
firecrawl_tool.py — Firecrawl web access as a callable tool for Ollama agents.

Ollama runs the model locally; it cannot reach the web on its own. Register the
functions below as tools so a local model can scrape and search the live web.

Auth: reads FIRECRAWL_API_KEY from the environment (never hardcode it).
    export FIRECRAWL_API_KEY="fc-..."

CLI (for OpenClaw / shell use):
    python3 firecrawl_tool.py scrape https://firecrawl.dev
    python3 firecrawl_tool.py search "best open source LLM 2026" --limit 5

As an Ollama tool (Python >= 3.9, `pip install ollama`):
    import ollama, firecrawl_tool
    resp = ollama.chat(
        model="llama3.1",
        messages=[{"role": "user", "content": "Summarize firecrawl.dev"}],
        tools=[firecrawl_tool.scrape, firecrawl_tool.search],
    )
    # then dispatch resp.message.tool_calls to the matching function.

Only depends on the standard library (urllib) so it runs anywhere.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API_BASE = os.environ.get("FIRECRAWL_API_BASE", "https://api.firecrawl.dev/v2")


def _post(endpoint: str, payload: dict) -> dict:
    key = os.environ.get("FIRECRAWL_API_KEY")
    if not key:
        raise RuntimeError(
            "FIRECRAWL_API_KEY is not set. Run: export FIRECRAWL_API_KEY=fc-..."
        )
    req = urllib.request.Request(
        f"{API_BASE}/{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"Firecrawl HTTP {e.code}: {body}") from e


def scrape(url: str, format: str = "markdown") -> dict:
    """Scrape a single web page and return its contents.

    Args:
        url: The page URL to fetch (e.g. "https://firecrawl.dev").
        format: One of "markdown" (default), "html", or "links".

    Returns:
        The Firecrawl JSON response with the scraped content.
    """
    return _post("scrape", {"url": url, "formats": [format]})


def search(query: str, limit: int = 5) -> dict:
    """Search the web and return ranked results.

    Args:
        query: The search query.
        limit: Maximum number of results (default 5).

    Returns:
        The Firecrawl JSON response with search results.
    """
    return _post("search", {"query": query, "limit": limit})


def _main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    cmd, rest = argv[0], argv[1:]
    try:
        if cmd == "scrape":
            if not rest:
                print("usage: firecrawl_tool.py scrape <url> [--format markdown|html|links]", file=sys.stderr)
                return 2
            url = rest[0]
            fmt = "markdown"
            if "--format" in rest:
                fmt = rest[rest.index("--format") + 1]
            result = scrape(url, fmt)
        elif cmd == "search":
            if not rest:
                print('usage: firecrawl_tool.py search "<query>" [--limit N]', file=sys.stderr)
                return 2
            query = rest[0]
            limit = 5
            if "--limit" in rest:
                limit = int(rest[rest.index("--limit") + 1])
            result = search(query, limit)
        else:
            print(f"unknown command '{cmd}'. Try: scrape, search, --help", file=sys.stderr)
            return 2
    except (RuntimeError, IndexError, ValueError) as e:
        print(f"firecrawl: {e}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
