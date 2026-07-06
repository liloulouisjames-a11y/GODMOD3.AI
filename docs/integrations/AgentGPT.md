# AgentGPT — install & run

[AgentGPT](https://github.com/reworkd/AgentGPT) is an autonomous AI agent you
run in the browser: you give it a goal, it decomposes it into tasks and
executes them in a loop, streaming results back to a web UI.

It is a two-service app:

- **`platform/`** — FastAPI backend (Python 3.11), talks to the LLM + a MySQL DB.
- **`next/`** — Next.js frontend (Node), the web UI + NextAuth login.

The upstream "one command" path is `./setup.sh`, which runs a CLI that wires up
Docker Compose (frontend + platform + MySQL). That is the easiest route when a
Docker daemon and image registry are available.

## What was actually run here (no-Docker, native)

The container could not pull Docker Hub images, so each service was run
natively. These are the exact, reproducible steps.

### 1. Database (MariaDB stands in for MySQL 8)

```bash
apt-get update && apt-get install -y mariadb-server default-libmysqlclient-dev pkg-config build-essential
service mariadb start
mysql -e "CREATE DATABASE IF NOT EXISTS reworkd_platform;
  CREATE USER IF NOT EXISTS 'reworkd_platform'@'localhost' IDENTIFIED BY 'reworkd_platform';
  GRANT ALL ON reworkd_platform.* TO 'reworkd_platform'@'localhost'; FLUSH PRIVILEGES;"
```

### 2. Environment files

`next/.env`:

```env
NODE_ENV="development"
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
NEXT_PUBLIC_MAX_LOOPS="100"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="mysql://reworkd_platform:reworkd_platform@localhost:3306/reworkd_platform"
```

`platform/.env`:

```env
REWORKD_PLATFORM_HOST="0.0.0.0"
REWORKD_PLATFORM_FF_MOCK_MODE_ENABLED="true"   # no OpenAI spend; flip to false + add a key for real runs
REWORKD_PLATFORM_OPENAI_API_KEY="changeme"
REWORKD_PLATFORM_FRONTEND_URL="http://localhost:3000"
REWORKD_PLATFORM_DB_HOST="localhost"
REWORKD_PLATFORM_DB_PORT="3306"
REWORKD_PLATFORM_DB_USER="reworkd_platform"
REWORKD_PLATFORM_DB_PASS="reworkd_platform"
REWORKD_PLATFORM_DB_BASE="reworkd_platform"
```

### 3. Backend

```bash
cd platform
python3 -m venv venv
./venv/bin/pip install .
# Pin lanarky to the version langchain 0.0.295 expects:
./venv/bin/pip install "lanarky==0.7.16"
```

**Offline tiktoken:** the backend loads the `cl100k_base` tokenizer at startup,
which normally downloads from `openaipublic.blob.core.windows.net`. If that host
is blocked, pre-seed the cache and point `TIKTOKEN_CACHE_DIR` at it (the ranks
can be reconstructed from the `js-tiktoken` npm package). Then:

```bash
TIKTOKEN_CACHE_DIR=./tiktoken-cache ./venv/bin/python -m reworkd_platform
# -> Uvicorn running on http://0.0.0.0:8000
```

### 4. Frontend

```bash
cd next
npm ci
npx prisma db push      # creates User/Session/Agent/AgentTask/... tables
npm run dev             # -> http://localhost:3000
```

## Using it

Open http://localhost:3000, sign in (NextAuth dev mode), type a goal such as
*"Build a marketing plan for GODMOD3.AI"*, and click **Deploy Agent**. The agent
creates tasks (Task X / Y / Z), analyzes and executes each, streams the result,
and offers to summarize.

The agent API can also be driven directly (auth is a bearer session token that
must exist in the `Session` table):

```bash
curl -X POST http://localhost:8000/api/agent/start \
  -H "Authorization: Bearer <sessionToken>" -H "Content-Type: application/json" \
  -d '{"goal":"Build a marketing plan for GODMOD3.AI","modelSettings":{"model":"gpt-3.5-turbo"}}'
# -> {"run_id":"...","newTasks":["Task X","Task Y","Task Z"]}
```

## Mock mode vs. real runs

`REWORKD_PLATFORM_FF_MOCK_MODE_ENABLED="true"` returns canned tasks/results so
you can exercise the whole loop **without spending any tokens**. For real runs,
set it to `false` and provide `REWORKD_PLATFORM_OPENAI_API_KEY` (and optionally
`REWORKD_PLATFORM_SERP_API_KEY` for the web-search tool). To keep cost down,
select a cheap model (e.g. `gpt-3.5-turbo` / `gpt-4o-mini`) and lower
`NEXT_PUBLIC_MAX_LOOPS`.
