---
name: web-access
description: Read live data from the web — scrape a URL to clean markdown, or run a web search — via the Firecrawl API. Use whenever the user asks for current information, a page's contents, prices, news, competitor research, or any fact that isn't already in context.
---

# Web Access (Firecrawl)

Gives the agent read access to the open web. Two operations, one script.

## Setup (once)

```bash
export FIRECRAWL_API_KEY="fc-..."        # from https://firecrawl.dev dashboard
```

Never hardcode the key in files or commit it. The script reads it from the
environment. Optional: `export FIRECRAWL_API_BASE=https://api.firecrawl.dev/v2`.

## Commands

```bash
# Scrape one page → clean markdown (default), or html / links
skills/web-access/scripts/firecrawl.sh scrape https://firecrawl.dev
skills/web-access/scripts/firecrawl.sh scrape example.com --format html

# Search the web → ranked results
skills/web-access/scripts/firecrawl.sh search "best open source LLM 2026" --limit 5
```

The raw Firecrawl call this wraps:

```bash
curl -X POST 'https://api.firecrawl.dev/v2/scrape' \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"url": "firecrawl.dev", "formats": ["markdown"]}'
```

## Workflow

1. **Decide scrape vs. search.** Known URL → `scrape`. Open question ("who are X's
   competitors?") → `search` first, then `scrape` the best 1–3 result URLs for detail.
2. **Run the script**, capture the markdown/JSON.
3. **Extract, then cite.** Pull only the facts the user needs; always report the source
   URL so claims are checkable. Quote sparingly and verbatim.
4. **Feed downstream.** For sales work, pipe findings into `lead-generation` (enrich a
   prospect from their site), `discovery-qualification` (research an account before a
   call), or `sales-copywriting` (pull real proof points).

## Rules

- **Freshness over memory:** when the user needs anything current (prices, news, live
  status), scrape/search — do not answer from training data.
- **Cite every scraped claim** with its URL. If a page won't load or returns an error,
  say so; don't invent contents.
- **Respect the source:** public pages only; honor robots/paywalls and don't use this to
  bypass logins or capture personal data.
- **Cost awareness:** each call consumes Firecrawl credits. Batch searches, cap `--limit`,
  and don't re-scrape the same URL in a loop.
