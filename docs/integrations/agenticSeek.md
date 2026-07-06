# AgenticSeek — install & low-token-cost setup

[AgenticSeek](https://github.com/Fosowl/agenticSeek) is a **100% local, private
alternative to Manus AI**. It autonomously browses the web (driving a real
browser), writes and runs code, and plans multi-step tasks — selecting the right
"agent" for each job. This is the tool that actually **controls parts of your
computer to get tasks done** (shell + browser), while keeping data on-device.

## The lowest-token-cost configuration

AgenticSeek's whole design goal is to run on **local** LLMs, which cost **zero
API tokens**. That is the cheapest possible setup and the one configured here.

`config.ini` (already set in the clone):

```ini
[MAIN]
is_local = True
provider_name = ollama
provider_model = qwen2.5:3b          # small, cheap, CPU-friendly; scale up if you have a GPU
provider_server_address = 127.0.0.1:11434
agent_name = Jarvis
[BROWSER]
headless_browser = True
```

Cost ladder, cheapest first:

| Setup | `provider_name` | Token cost | Notes |
|-------|-----------------|-----------|-------|
| **Local (Ollama/LM-Studio)** | `ollama` / `lm-studio` | **$0** | No API tokens ever. Needs a local model + enough RAM/VRAM. Best for "always lowest cost". |
| **Deepseek API** | `deepseek` | very low | Cheapest mainstream hosted API (`deepseek-chat`). Needs `DEEPSEEK_API_KEY`. |
| **OpenRouter free tier** | `openrouter` | ~$0 | Some models are free/near-free; needs `OPENROUTER_API_KEY`. |
| **OpenAI** | `openai` | higher | Use `gpt-4o-mini` if you must; avoid for "lowest cost". |

To use a cheap hosted API instead of local, set `is_local = False`, pick the
provider/model above, and put the key in `.env`.

## Install steps performed here

```bash
git clone https://github.com/Fosowl/agenticSeek.git
cd agenticSeek
cp .env.example .env            # then edit WORK_DIR + SEARXNG_BASE_URL
python3 -m venv venv
./venv/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
```

`.env` values that matter for CLI mode on a single host:

```env
WORK_DIR="/home/user/agenticSeek/workspace"   # files the agent may read/write
SEARXNG_BASE_URL="http://localhost:8080"       # CLI mode reaches SearXNG on the host port
```

> The CPU PyTorch index (`--extra-index-url .../whl/cpu`) keeps the install
> light — no multi-GB CUDA wheels. The dependency set is large (torch,
> transformers, selenium, vosk, undetected-chromedriver), so the first install
> takes a while.

## Running it

AgenticSeek needs three things live: **SearXNG** (search), **Redis** (task
queue), and an **LLM backend**.

```bash
# 1. Bring up SearXNG + Redis (bundled compose file)
./start_services.sh            # or: docker compose up searxng redis -d

# 2. Start a local LLM (zero token cost)
ollama serve &                 # install from https://ollama.com
ollama pull qwen2.5:3b

# 3a. CLI mode
./venv/bin/python cli.py

# 3b. or the web UI + API backend
./venv/bin/python api.py       # backend on :7777, open the frontend
```

Then ask it something like:
*"Search the web for the AgenticSeek project and summarize what it does."*
It will pick the browser agent, drive a headless browser, and report back —
without sending a single paid token when running on a local model.

## Notes / gotchas

- **Local model = free but not free of hardware.** `qwen2.5:3b` runs on CPU but
  slowly; a 14B+ reasoning model (Deepseek-R1, Magistral) gives much better
  agentic behavior and wants a GPU.
- **Security:** the `/query` backend endpoint is unauthenticated and the agent
  runs shell commands, so keep the backend bound to `127.0.0.1` (the default).
- If you can't run a local model at all, the **Deepseek API** row above is the
  lowest-cost hosted fallback.
