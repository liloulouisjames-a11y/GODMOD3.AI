/**
 * G0DM0D3 WebSocket Gateway (OpenClaw)
 *
 * Provides real-time model updates, status streaming, and live race updates
 * via WebSocket for the GODMOD3 frontend.
 *
 * Runs on configurable port (default: 12345)
 */

import WebSocket, { Server as WebSocketServer } from 'ws'
import http from 'http'
import { ULTRAPLINIAN_MODELS } from './lib/ultraplinian'

const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '12345', 10)
const server = http.createServer()
const wss = new WebSocketServer({ server })

// ── Message Types ─────────────────────────────────────────────────────
interface ModelUpdate {
  type: 'model_list'
  models: {
    id: string
    tier: string
    description: string
    model_count: number
  }[]
}

interface RaceUpdate {
  type: 'race_progress'
  race_id: string
  current_model: string
  leader: {
    model: string
    score: number
    content_preview: string
  }
  models_responded: number
  models_total: number
}

interface SystemStatus {
  type: 'system_status'
  status: 'healthy' | 'degraded' | 'offline'
  timestamp: number
  uptime_ms: number
  api_endpoint: string
}

type GatewayMessage = ModelUpdate | RaceUpdate | SystemStatus

// ── Globals ────────────────────────────────────────────────────────
const startTime = Date.now()
const connectedClients = new Set<WebSocket>()

// ── Model Update Publisher ────────────────────────────────────────
function publishModelUpdate() {
  const models = [
    {
      id: 'ultraplinian',
      tier: 'fast',
      description: `Race ${ULTRAPLINIAN_MODELS.fast.length} models in parallel`,
      model_count: ULTRAPLINIAN_MODELS.fast.length,
    },
    {
      id: 'ultraplinian-standard',
      tier: 'standard',
      description: `Race ${ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length} models in parallel`,
      model_count: ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length,
    },
    {
      id: 'ultraplinian-smart',
      tier: 'smart',
      description: `Race ${ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length + ULTRAPLINIAN_MODELS.smart.length} models in parallel`,
      model_count: ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length + ULTRAPLINIAN_MODELS.smart.length,
    },
    {
      id: 'ultraplinian-power',
      tier: 'power',
      description: `Race ${ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length + ULTRAPLINIAN_MODELS.smart.length + ULTRAPLINIAN_MODELS.power.length} models in parallel`,
      model_count: ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length + ULTRAPLINIAN_MODELS.smart.length + ULTRAPLINIAN_MODELS.power.length,
    },
    {
      id: 'ultraplinian-ultra',
      tier: 'ultra',
      description: `Race all ${ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length + ULTRAPLINIAN_MODELS.smart.length + ULTRAPLINIAN_MODELS.power.length + ULTRAPLINIAN_MODELS.ultra.length} models in parallel`,
      model_count: ULTRAPLINIAN_MODELS.fast.length + ULTRAPLINIAN_MODELS.standard.length + ULTRAPLINIAN_MODELS.smart.length + ULTRAPLINIAN_MODELS.power.length + ULTRAPLINIAN_MODELS.ultra.length,
    },
  ]

  const message: ModelUpdate = {
    type: 'model_list',
    models,
  }

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })
}

// ── System Status Publisher ────────────────────────────────────────
function publishSystemStatus() {
  const message: SystemStatus = {
    type: 'system_status',
    status: 'healthy',
    timestamp: Date.now(),
    uptime_ms: Date.now() - startTime,
    api_endpoint: process.env.API_ENDPOINT || 'http://localhost:7860',
  }

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  })
}

// ── Connection Handler ────────────────────────────────────────────
wss.on('connection', (ws: WebSocket) => {
  connectedClients.add(ws)
  console.log(`[Gateway] Client connected. Total clients: ${connectedClients.size}`)

  // Send initial model list
  publishModelUpdate()

  // Send system status
  publishSystemStatus()

  // Handle incoming messages
  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data)

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          break

        case 'subscribe_models':
          publishModelUpdate()
          break

        case 'subscribe_status':
          publishSystemStatus()
          break

        default:
          ws.send(JSON.stringify({ error: 'Unknown message type', type: message.type }))
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }))
    }
  })

  // Handle disconnection
  ws.on('close', () => {
    connectedClients.delete(ws)
    console.log(`[Gateway] Client disconnected. Total clients: ${connectedClients.size}`)
  })

  // Handle errors
  ws.on('error', (err) => {
    console.error('[Gateway] WebSocket error:', err.message)
  })
})

// ── Periodic broadcasts (every 5 seconds) ──────────────────────────
setInterval(() => {
  if (connectedClients.size > 0) {
    publishSystemStatus()
  }
}, 5000)

// ── Start ──────────────────────────────────────────────────────────
server.listen(GATEWAY_PORT, '127.0.0.1', () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║  G0DM0D3 OpenClaw WebSocket Gateway v0.4.0              ║
  ║  ws://127.0.0.1:${String(GATEWAY_PORT).padEnd(5)}                              ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                          ║
  ║  Real-time model updates & race status                   ║
  ║                                                          ║
  ║  MESSAGES:                                               ║
  ║  • ping           → server responds with pong             ║
  ║  • subscribe_models → receive model list updates         ║
  ║  • subscribe_status → receive system status updates      ║
  ║                                                          ║
  ║  AUTO-BROADCAST (every 5s):                              ║
  ║  • system_status  → gateway health & uptime              ║
  ║                                                          ║
  ║  Connected clients: 0                                    ║
  ╚══════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Gateway] Shutting down...')
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down')
  })
  server.close(() => {
    console.log('[Gateway] Shutdown complete')
    process.exit(0)
  })
})
