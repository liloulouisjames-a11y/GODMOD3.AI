/**
 * G0DM0D3 Research Preview API
 *
 * Exposes the core engines (AutoTune, Parseltongue, STM, Feedback Loop) and the
 * multi-model modes (ULTRAPLINIAN racing via the chat route, CONSORTIUM synthesis)
 * as a REST API, plus opt-in dataset collection and content-free ZDR metadata.
 *
 * Entry point for `npm run api` (tsx api/server.ts). Designed for any container
 * host — Docker, Hugging Face Spaces, or bare Node.
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from './middleware/rateLimit'
import { apiKeyAuth } from './middleware/auth'
import { autotuneRoutes } from './routes/autotune'
import { parseltongueRoutes } from './routes/parseltongue'
import { chatRoutes } from './routes/chat'
import { consortiumRoutes } from './routes/consortium'
import { feedbackRoutes } from './routes/feedback'
import { datasetRoutes } from './routes/dataset'
import { metadataRoutes } from './routes/metadata'

const app = express()
const PORT = parseInt(process.env.PORT || '7860', 10)

// ── Middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  // API serves JSON/SSE only; CSP tuned for a hosted API surface, not a page.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*'
    ? true
    : [process.env.CORS_ORIGIN || 'https://godmod3.ai'].filter(Boolean),
  credentials: false,
}))
app.use(express.json({ limit: '1mb' }))

// ── Health / Info (no auth required) ──────────────────────────────────
app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.get('/v1/info', (_req, res) => {
  res.json({
    name: 'G0DM0D3 Research Preview API',
    version: '0.4.0',
    description:
      'OpenAI-compatible API for the G0DM0D3 pipeline (GODMODE, AutoTune, Parseltongue, STM) ' +
      'with ULTRAPLINIAN multi-model racing and CONSORTIUM synthesis. Use any OpenAI SDK — just swap the base_url.',
    license: 'AGPL-3.0',
    quickstart: {
      python: [
        'from openai import OpenAI',
        'client = OpenAI(base_url="<THIS_URL>/v1", api_key="<YOUR_KEY>")',
        'r = client.chat.completions.create(model="ultraplinian/fast", messages=[{"role":"user","content":"Hello"}])',
        'print(r.choices[0].message.content)',
      ],
      curl:
        'curl <THIS_URL>/v1/chat/completions -H "Authorization: Bearer <KEY>" ' +
        '-H "Content-Type: application/json" ' +
        '-d \'{"model":"ultraplinian/fast","messages":[{"role":"user","content":"Hello"}]}\'',
    },
    models: {
      'ultraplinian/fast':     'Race models, return the best (fast tier)',
      'ultraplinian/standard': 'Race more models (standard tier)',
      'ultraplinian/smart':    'Race with composite scoring (smart tier)',
      'ultraplinian/power':    'Race a wide field (power tier)',
      'ultraplinian/ultra':    'Race the full field (ultra tier)',
      '<any-openrouter-model>': 'Single-model with GODMODE pipeline (e.g. openai/gpt-4o)',
    },
    endpoints: {
      'POST /v1/chat/completions':        'OpenAI-compatible — single model or ultraplinian/* racing',
      'POST /v1/consortium/completions':  'CONSORTIUM — query N models, synthesize one grounded answer (SSE)',
      'POST /v1/autotune/analyze':        'Analyze message context and compute optimal LLM parameters',
      'POST /v1/parseltongue/encode':     'Obfuscate trigger words in text',
      'POST /v1/parseltongue/detect':     'Detect trigger words in text',
      'GET  /v1/parseltongue/techniques': 'List available obfuscation techniques',
      'POST /v1/feedback':                'Submit quality feedback for the EMA learning loop',
      'GET  /v1/feedback/stats':          'Feedback-loop learning statistics',
      'GET  /v1/dataset/stats':           'Dataset collection statistics',
      'GET  /v1/dataset/export':          'Export the open research dataset (JSON or JSONL)',
      'DELETE /v1/dataset/:id':           'Delete a dataset entry (right-to-delete)',
      'GET  /v1/metadata/stats':          'ZDR usage analytics (models, latency, pipeline stats — no content)',
      'GET  /v1/metadata/events':         'Raw metadata event log (Enterprise tier; paginated, content-free)',
    },
    authentication: {
      openrouter_key: process.env.OPENROUTER_API_KEY
        ? 'Server-provided (callers do NOT need their own OpenRouter key)'
        : 'Caller must provide openrouter_api_key in request body (or extra_body in Python SDK)',
      api_key: 'Send Authorization: Bearer <your-api-key> header (auth disabled if no keys configured)',
    },
    source: 'https://github.com/liloulouisjames-a11y/GODMOD3.AI',
  })
})

// ── OpenAI-compatible + multi-model routes (primary API surface) ──────
app.use('/v1/chat', apiKeyAuth, rateLimit, chatRoutes)
app.use('/v1/consortium', apiKeyAuth, rateLimit, consortiumRoutes)

// ── Engine routes ─────────────────────────────────────────────────────
app.use('/v1/autotune', apiKeyAuth, rateLimit, autotuneRoutes)
app.use('/v1/parseltongue', apiKeyAuth, rateLimit, parseltongueRoutes)
app.use('/v1/feedback', apiKeyAuth, rateLimit, feedbackRoutes)
app.use('/v1/dataset', apiKeyAuth, rateLimit, datasetRoutes)
app.use('/v1/metadata', apiKeyAuth, metadataRoutes) // no rate limit — read-only analytics

// ── 404 ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found. See GET /v1/info for available endpoints.' })
})

// ── Error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[godmode] G0DM0D3 API v0.4.0 listening on http://0.0.0.0:${PORT}`)
  console.log('[godmode] OpenAI-compatible:  POST /v1/chat/completions   (model="ultraplinian/fast")')
  console.log('[godmode] Consortium:         POST /v1/consortium/completions')
  console.log('[godmode] Info & endpoints:   GET  /v1/info')
})

export default app
