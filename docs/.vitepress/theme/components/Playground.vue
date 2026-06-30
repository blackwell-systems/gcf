<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { encode, decode, encodeGeneric, decodeGeneric } from '@blackwell-systems/gcf'
import type { Payload } from '@blackwell-systems/gcf'
import { encode as toonEncode } from '@toon-format/toon'
import jsYaml from 'js-yaml'
import { parse as tomlParse, stringify as tomlStringify } from 'smol-toml'
import Papa from 'papaparse'
import { encode as msgpackEncode, decode as msgpackDecode } from '@msgpack/msgpack'
const highlightFn = ref<((code: string) => string) | null>(null)
const highlightJsonFn = ref<((code: string) => string) | null>(null)
const highlightToonFn = ref<((code: string) => string) | null>(null)

// ---------------------------------------------------------------------------
// TOON encoding: uses the real @toon-format/toon library (same one used
// in the comprehension eval). We pass the raw JSON object to toon's encode()
// with keyFolding: 'safe' (TOON's recommended setting for structured data).
// ---------------------------------------------------------------------------

function encodeTOON(obj: any): string {
  return toonEncode(obj, { keyFolding: 'safe' })
}

// Detect if an object looks like a GCF Payload (has tool + symbols)
function isPayloadShaped(obj: any): boolean {
  return obj && typeof obj.tool === 'string' && Array.isArray(obj.symbols)
}

// ---------------------------------------------------------------------------
// Session dedup simulation: encode the same payload twice, show bare refs
// on the second call.
// ---------------------------------------------------------------------------

function encodeSessionCall2(obj: any): string {
  const syms: any[] = obj.symbols ?? []
  const edges: any[] = obj.edges ?? []
  const lines: string[] = []

  lines.push(`GCF profile=graph tool=${obj.tool} budget=${obj.tokenBudget || 0} tokens=${obj.tokensUsed || 0} symbols=${syms.length} edges=${edges.length} session=true`)

  const groupNames = ['targets', 'related', 'extended']
  let currentDist: number | null = null
  const symIndex: Record<string, number> = {}

  for (let i = 0; i < syms.length; i++) {
    const s = syms[i]
    symIndex[s.qualifiedName] = i

    if (s.distance !== currentDist) {
      currentDist = s.distance
      const name = currentDist < groupNames.length ? groupNames[currentDist] : `distance_${currentDist}`
      lines.push(`## ${name}`)
    }

    // All symbols were "sent before" so they become bare refs
    lines.push(`@${i}  # previously transmitted`)
  }

  // Edges still need to be sent (topology may differ)
  if (edges.length > 0) {
    lines.push(`## edges [${edges.length}]`)
    for (const e of edges) {
      const srcIdx = symIndex[e.source]
      const tgtIdx = symIndex[e.target]
      if (srcIdx !== undefined && tgtIdx !== undefined) {
        lines.push(`@${tgtIdx}<@${srcIdx} ${e.edgeType}`)
      }
    }
  }

  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// Presets: real MCP tool response shapes
// ---------------------------------------------------------------------------

const PRESETS: Record<string, { label: string; json: any }> = {
  event_logs: {
    label: 'Event logs (semi-uniform, 15 records)',
    json: {
      events: [
        { timestamp: '2026-06-05T18:00:01Z', level: 'info', service: 'api-gateway', message: 'Request received', method: 'POST', path: '/api/users', duration_ms: 45, status: 200 },
        { timestamp: '2026-06-05T18:00:02Z', level: 'info', service: 'user-service', message: 'User created', method: 'POST', path: '/internal/users', duration_ms: 120, status: 201 },
        { timestamp: '2026-06-05T18:00:03Z', level: 'error', service: 'user-service', message: 'Database timeout', method: 'POST', path: '/internal/users', duration_ms: 5003, status: 504, error: { code: 'DB_TIMEOUT', detail: 'Connection pool exhausted', retryable: true } },
        { timestamp: '2026-06-05T18:00:04Z', level: 'warn', service: 'api-gateway', message: 'Rate limit approaching', method: 'GET', path: '/api/users/1042', duration_ms: 12, status: 200 },
        { timestamp: '2026-06-05T18:00:05Z', level: 'info', service: 'auth-service', message: 'Token validated', method: 'GET', path: '/internal/auth/validate', duration_ms: 8, status: 200 },
        { timestamp: '2026-06-05T18:00:06Z', level: 'error', service: 'api-gateway', message: 'Upstream unavailable', method: 'GET', path: '/api/products', duration_ms: 3001, status: 502, error: { code: 'UPSTREAM_DOWN', detail: 'product-service not responding', retryable: true } },
        { timestamp: '2026-06-05T18:00:07Z', level: 'info', service: 'cache-service', message: 'Cache hit', method: 'GET', path: '/internal/cache/users:1042', duration_ms: 2, status: 200 },
        { timestamp: '2026-06-05T18:00:08Z', level: 'info', service: 'api-gateway', message: 'Request received', method: 'DELETE', path: '/api/users/1043', duration_ms: 67, status: 200 },
        { timestamp: '2026-06-05T18:00:09Z', level: 'warn', service: 'user-service', message: 'Soft delete applied', method: 'DELETE', path: '/internal/users/1043', duration_ms: 34, status: 200 },
        { timestamp: '2026-06-05T18:00:10Z', level: 'info', service: 'event-bus', message: 'Event published', method: 'POST', path: '/internal/events', duration_ms: 5, status: 202 },
        { timestamp: '2026-06-05T18:00:11Z', level: 'error', service: 'notification-service', message: 'Email delivery failed', method: 'POST', path: '/internal/notify', duration_ms: 2500, status: 500, error: { code: 'SMTP_ERROR', detail: 'Connection refused to mail server', retryable: false } },
        { timestamp: '2026-06-05T18:00:12Z', level: 'info', service: 'api-gateway', message: 'Request received', method: 'GET', path: '/api/users', duration_ms: 23, status: 200 },
        { timestamp: '2026-06-05T18:00:13Z', level: 'info', service: 'user-service', message: 'Query executed', method: 'GET', path: '/internal/users', duration_ms: 15, status: 200 },
        { timestamp: '2026-06-05T18:00:14Z', level: 'info', service: 'cache-service', message: 'Cache miss', method: 'GET', path: '/internal/cache/products:all', duration_ms: 1, status: 404 },
        { timestamp: '2026-06-05T18:00:15Z', level: 'info', service: 'api-gateway', message: 'Request completed', method: 'GET', path: '/api/users', duration_ms: 41, status: 200 },
      ],
    },
  },
  api_response: {
    label: 'API response (mixed: arrays, nested, primitives)',
    json: {
      requestId: 'req_8f3a2c91',
      generatedAt: '2026-06-05T18:42:17Z',
      environment: 'development',
      users: [
        { id: 1042, username: 'luna_dev', active: true, roles: ['admin', 'developer'], profile: { displayName: 'Luna Hart', email: 'luna.hart@example.com', timezone: 'America/Phoenix' }, preferences: { theme: 'dark', notifications: { email: true, push: false } } },
        { id: 1043, username: 'marco_ops', active: false, roles: ['operator'], profile: { displayName: 'Marco Vale', email: 'marco.vale@example.com', timezone: 'America/Chicago' }, preferences: { theme: 'light', notifications: { email: false, push: true } } },
      ],
      metrics: { totalRequests: 28741, successRate: 0.982, averageLatencyMs: 143.7, errorCounts: { 400: 31, 404: 87, 500: 12 } },
      features: [
        { name: 'streaming', enabled: true, rolloutPercentage: 100 },
        { name: 'experimentalParser', enabled: true, rolloutPercentage: 15 },
        { name: 'legacyMode', enabled: false, rolloutPercentage: 0 },
      ],
      tags: ['sample', 'generated', 'json'],
      metadata: { region: 'us-west-2', version: '2.4.1', nullableField: null },
    },
  },
  orders: {
    label: 'Orders with nested items (10 rows)',
    json: {
      orders: [
        { id: 1001, total: 249.99, status: 'shipped', customer: { name: 'Alice Smith', tier: 'premium', email: 'alice@example.com' }, tags: ['express', 'gift-wrapped'] },
        { id: 1002, total: 89.50, status: 'pending', customer: { name: 'Bob Jones', tier: 'standard', email: 'bob@example.com' }, tags: ['standard'] },
        { id: 1003, total: 512.00, status: 'delivered', customer: { name: 'Carol Wu', tier: 'premium', email: 'carol@example.com' }, tags: ['express', 'insured'] },
        { id: 1004, total: 34.99, status: 'shipped', customer: { name: 'Dan Lee', tier: 'standard', email: 'dan@example.com' }, tags: ['standard'] },
        { id: 1005, total: 178.50, status: 'pending', customer: { name: 'Eve Park', tier: 'premium', email: 'eve@example.com' }, tags: ['express'] },
        { id: 1006, total: 623.00, status: 'delivered', customer: { name: 'Frank Chen', tier: 'enterprise', email: 'frank@example.com' }, tags: ['priority', 'insured', 'gift-wrapped'] },
        { id: 1007, total: 45.00, status: 'shipped', customer: { name: 'Grace Kim', tier: 'standard', email: 'grace@example.com' }, tags: ['standard'] },
        { id: 1008, total: 299.99, status: 'pending', customer: { name: 'Hank Davis', tier: 'premium', email: 'hank@example.com' }, tags: ['express', 'insured'] },
        { id: 1009, total: 156.75, status: 'delivered', customer: { name: 'Iris Wang', tier: 'standard', email: 'iris@example.com' }, tags: ['standard'] },
        { id: 1010, total: 891.00, status: 'shipped', customer: { name: 'Jack Brown', tier: 'enterprise', email: 'jack@example.com' }, tags: ['priority', 'express', 'insured'] },
      ],
    },
  },
  blast_radius: {
    label: 'Blast radius (8 symbols, 6 edges)',
    json: {
      tool: 'blast_radius',
      tokenBudget: 10000,
      tokensUsed: 2400,
      symbols: [
        { qualifiedName: 'github.com/org/repo/pkg.AuthMiddleware', kind: 'function', score: 0.92, provenance: 'lsp_resolved', distance: 0 },
        { qualifiedName: 'github.com/org/repo/pkg.ValidateToken', kind: 'function', score: 0.87, provenance: 'lsp_resolved', distance: 0 },
        { qualifiedName: 'github.com/org/repo/pkg.AuthConfig', kind: 'type', score: 0.71, provenance: 'ast_inferred', distance: 0 },
        { qualifiedName: 'github.com/org/repo/pkg.NewServer', kind: 'function', score: 0.65, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/pkg.Server.Start', kind: 'method', score: 0.58, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/pkg.Router', kind: 'type', score: 0.52, provenance: 'ast_inferred', distance: 1 },
        { qualifiedName: 'github.com/org/repo/internal.TokenCache', kind: 'type', score: 0.41, provenance: 'structural', distance: 2 },
        { qualifiedName: 'github.com/org/repo/internal.Logger', kind: 'interface', score: 0.35, provenance: 'structural', distance: 2 },
      ],
      edges: [
        { source: 'github.com/org/repo/pkg.NewServer', target: 'github.com/org/repo/pkg.AuthMiddleware', edgeType: 'calls' },
        { source: 'github.com/org/repo/pkg.AuthMiddleware', target: 'github.com/org/repo/pkg.ValidateToken', edgeType: 'calls' },
        { source: 'github.com/org/repo/pkg.ValidateToken', target: 'github.com/org/repo/internal.TokenCache', edgeType: 'references' },
        { source: 'github.com/org/repo/pkg.Server.Start', target: 'github.com/org/repo/pkg.Router', edgeType: 'references' },
        { source: 'github.com/org/repo/pkg.NewServer', target: 'github.com/org/repo/pkg.AuthConfig', edgeType: 'references' },
        { source: 'github.com/org/repo/pkg.AuthMiddleware', target: 'github.com/org/repo/internal.Logger', edgeType: 'implements' },
      ],
    },
  },
  context_for_task: {
    label: 'Context for task (15 symbols, 12 edges)',
    json: {
      tool: 'context_for_task',
      tokenBudget: 20000,
      tokensUsed: 5200,
      symbols: [
        { qualifiedName: 'github.com/org/repo/api.HandleCreateUser', kind: 'function', score: 0.95, provenance: 'lsp_resolved', distance: 0 },
        { qualifiedName: 'github.com/org/repo/api.HandleGetUser', kind: 'function', score: 0.91, provenance: 'lsp_resolved', distance: 0 },
        { qualifiedName: 'github.com/org/repo/api.HandleDeleteUser', kind: 'function', score: 0.88, provenance: 'lsp_resolved', distance: 0 },
        { qualifiedName: 'github.com/org/repo/api.UserRequest', kind: 'type', score: 0.85, provenance: 'ast_inferred', distance: 0 },
        { qualifiedName: 'github.com/org/repo/service.UserService', kind: 'type', score: 0.78, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/service.UserService.Create', kind: 'method', score: 0.75, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/service.UserService.Get', kind: 'method', score: 0.72, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/service.UserService.Delete', kind: 'method', score: 0.70, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/service.Validator', kind: 'interface', score: 0.65, provenance: 'structural', distance: 1 },
        { qualifiedName: 'github.com/org/repo/store.UserStore', kind: 'type', score: 0.55, provenance: 'lsp_resolved', distance: 2 },
        { qualifiedName: 'github.com/org/repo/store.UserStore.Insert', kind: 'method', score: 0.52, provenance: 'lsp_resolved', distance: 2 },
        { qualifiedName: 'github.com/org/repo/store.UserStore.FindByID', kind: 'method', score: 0.50, provenance: 'lsp_resolved', distance: 2 },
        { qualifiedName: 'github.com/org/repo/store.UserStore.Remove', kind: 'method', score: 0.48, provenance: 'lsp_resolved', distance: 2 },
        { qualifiedName: 'github.com/org/repo/store.DB', kind: 'interface', score: 0.42, provenance: 'structural', distance: 2 },
        { qualifiedName: 'github.com/org/repo/events.Publisher', kind: 'interface', score: 0.38, provenance: 'structural', distance: 2 },
      ],
      edges: [
        { source: 'github.com/org/repo/api.HandleCreateUser', target: 'github.com/org/repo/service.UserService.Create', edgeType: 'calls' },
        { source: 'github.com/org/repo/api.HandleGetUser', target: 'github.com/org/repo/service.UserService.Get', edgeType: 'calls' },
        { source: 'github.com/org/repo/api.HandleDeleteUser', target: 'github.com/org/repo/service.UserService.Delete', edgeType: 'calls' },
        { source: 'github.com/org/repo/api.HandleCreateUser', target: 'github.com/org/repo/api.UserRequest', edgeType: 'references' },
        { source: 'github.com/org/repo/service.UserService.Create', target: 'github.com/org/repo/store.UserStore.Insert', edgeType: 'calls' },
        { source: 'github.com/org/repo/service.UserService.Get', target: 'github.com/org/repo/store.UserStore.FindByID', edgeType: 'calls' },
        { source: 'github.com/org/repo/service.UserService.Delete', target: 'github.com/org/repo/store.UserStore.Remove', edgeType: 'calls' },
        { source: 'github.com/org/repo/service.UserService.Create', target: 'github.com/org/repo/service.Validator', edgeType: 'references' },
        { source: 'github.com/org/repo/store.UserStore', target: 'github.com/org/repo/store.DB', edgeType: 'implements' },
        { source: 'github.com/org/repo/service.UserService.Create', target: 'github.com/org/repo/events.Publisher', edgeType: 'references' },
        { source: 'github.com/org/repo/store.UserStore.Insert', target: 'github.com/org/repo/store.DB', edgeType: 'references' },
        { source: 'github.com/org/repo/store.UserStore.FindByID', target: 'github.com/org/repo/store.DB', edgeType: 'references' },
      ],
    },
  },
  communities: {
    label: 'Communities (5 symbols, 4 edges)',
    json: {
      tool: 'communities',
      tokenBudget: 5000,
      tokensUsed: 800,
      symbols: [
        { qualifiedName: 'github.com/org/repo/auth.Middleware', kind: 'function', score: 0.90, provenance: 'lsp_resolved', distance: 0 },
        { qualifiedName: 'github.com/org/repo/auth.Config', kind: 'type', score: 0.82, provenance: 'ast_inferred', distance: 0 },
        { qualifiedName: 'github.com/org/repo/http.Router', kind: 'type', score: 0.68, provenance: 'lsp_resolved', distance: 1 },
        { qualifiedName: 'github.com/org/repo/http.Handler', kind: 'interface', score: 0.61, provenance: 'structural', distance: 1 },
        { qualifiedName: 'github.com/org/repo/log.Logger', kind: 'interface', score: 0.45, provenance: 'structural', distance: 2 },
      ],
      edges: [
        { source: 'github.com/org/repo/http.Router', target: 'github.com/org/repo/auth.Middleware', edgeType: 'calls' },
        { source: 'github.com/org/repo/auth.Middleware', target: 'github.com/org/repo/auth.Config', edgeType: 'references' },
        { source: 'github.com/org/repo/auth.Middleware', target: 'github.com/org/repo/http.Handler', edgeType: 'implements' },
        { source: 'github.com/org/repo/auth.Middleware', target: 'github.com/org/repo/log.Logger', edgeType: 'references' },
      ],
    },
  },
}

// ---------------------------------------------------------------------------
// Format-specific presets
// ---------------------------------------------------------------------------

type InputFormat = 'json' | 'yaml' | 'toml'
type EncodeFormat = 'json' | 'yaml' | 'toml' | 'csv' | 'msgpack'
type DecodeFormat = 'json' | 'yaml' | 'toml' | 'csv' | 'msgpack'

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const FORMAT_PRESETS: Record<InputFormat, Record<string, { label: string; text: string }>> = {
  json: {}, // populated from PRESETS above
  yaml: {
    yaml_config: {
      label: 'Application config (12 services)',
      text: `services:
  - name: api-gateway
    port: 8080
    replicas: 3
    health_check: /healthz
    environment: production
    dependencies:
      - user-service
      - auth-service
    limits:
      cpu: "500m"
      memory: "256Mi"
  - name: user-service
    port: 8081
    replicas: 2
    health_check: /health
    environment: production
    dependencies:
      - postgres
      - redis
    limits:
      cpu: "250m"
      memory: "128Mi"
  - name: auth-service
    port: 8082
    replicas: 2
    health_check: /health
    environment: production
    dependencies:
      - redis
      - vault
    limits:
      cpu: "250m"
      memory: "128Mi"
  - name: notification-service
    port: 8083
    replicas: 1
    health_check: /healthz
    environment: production
    dependencies:
      - rabbitmq
      - smtp-relay
    limits:
      cpu: "100m"
      memory: "64Mi"
  - name: analytics-service
    port: 8084
    replicas: 2
    health_check: /health
    environment: production
    dependencies:
      - clickhouse
      - kafka
    limits:
      cpu: "1000m"
      memory: "512Mi"
  - name: search-service
    port: 8085
    replicas: 2
    health_check: /health
    environment: production
    dependencies:
      - elasticsearch
    limits:
      cpu: "500m"
      memory: "256Mi"
  - name: payment-service
    port: 8086
    replicas: 3
    health_check: /healthz
    environment: production
    dependencies:
      - postgres
      - stripe-api
    limits:
      cpu: "500m"
      memory: "256Mi"
  - name: inventory-service
    port: 8087
    replicas: 2
    health_check: /health
    environment: production
    dependencies:
      - postgres
      - redis
    limits:
      cpu: "250m"
      memory: "128Mi"
  - name: shipping-service
    port: 8088
    replicas: 1
    health_check: /health
    environment: production
    dependencies:
      - postgres
      - fedex-api
    limits:
      cpu: "100m"
      memory: "64Mi"
  - name: email-service
    port: 8089
    replicas: 1
    health_check: /healthz
    environment: production
    dependencies:
      - smtp-relay
      - template-store
    limits:
      cpu: "100m"
      memory: "64Mi"
  - name: cache-service
    port: 8090
    replicas: 3
    health_check: /health
    environment: production
    dependencies:
      - redis
    limits:
      cpu: "250m"
      memory: "512Mi"
  - name: logging-service
    port: 8091
    replicas: 2
    health_check: /health
    environment: production
    dependencies:
      - elasticsearch
      - kafka
    limits:
      cpu: "500m"
      memory: "256Mi"`,
    },
    yaml_pipeline: {
      label: 'CI/CD pipeline',
      text: `stages:
  - name: build
    steps:
      - run: npm install
        timeout: 300
      - run: npm run build
        timeout: 600
      - run: npm test
        timeout: 300
    artifacts:
      - dist/
      - coverage/
  - name: lint
    steps:
      - run: npm run lint
        timeout: 120
      - run: npm run typecheck
        timeout: 180
    allow_failure: false
  - name: deploy-staging
    steps:
      - run: kubectl apply -f k8s/staging/
        timeout: 120
      - run: kubectl rollout status deployment/app
        timeout: 300
    environment: staging
    requires:
      - build
      - lint
  - name: integration-tests
    steps:
      - run: npm run test:integration
        timeout: 600
      - run: npm run test:e2e
        timeout: 900
    environment: staging
    requires:
      - deploy-staging
  - name: deploy-production
    steps:
      - run: kubectl apply -f k8s/production/
        timeout: 120
      - run: kubectl rollout status deployment/app
        timeout: 600
    environment: production
    requires:
      - integration-tests
    manual: true`,
    },
  },
  toml: {
    toml_dependencies: {
      label: 'Package dependencies (15 packages)',
      text: `[project]
name = "analytics-platform"
version = "4.1.0"

[[dependencies]]
name = "tokio"
version = "1.44.2"
features = ["full", "tracing", "parking_lot"]
optional = false
source = "crates.io"

[[dependencies]]
name = "serde"
version = "1.0.219"
features = ["derive", "rc", "alloc"]
optional = false
source = "crates.io"

[[dependencies]]
name = "sqlx"
version = "0.8.6"
features = ["runtime-tokio-rustls", "postgres", "json", "chrono", "uuid"]
optional = false
source = "crates.io"

[[dependencies]]
name = "clap"
version = "4.5.38"
features = ["derive", "env", "wrap_help", "color"]
optional = false
source = "crates.io"

[[dependencies]]
name = "tracing"
version = "0.1.41"
features = ["log", "attributes"]
optional = false
source = "crates.io"

[[dependencies]]
name = "reqwest"
version = "0.12.15"
features = ["json", "rustls-tls", "gzip", "brotli", "stream"]
optional = false
source = "crates.io"

[[dependencies]]
name = "axum"
version = "0.8.4"
features = ["json", "multipart", "ws", "tracing"]
optional = false
source = "crates.io"

[[dependencies]]
name = "redis"
version = "0.29.1"
features = ["tokio-comp", "connection-manager", "json"]
optional = true
source = "crates.io"

[[dependencies]]
name = "clickhouse"
version = "0.13.2"
features = ["tls", "lz4"]
optional = true
source = "crates.io"

[[dependencies]]
name = "kafka"
version = "0.10.1"
features = ["ssl", "sasl", "compression"]
optional = true
source = "crates.io"

[[dependencies]]
name = "prometheus"
version = "0.14.0"
features = ["process"]
optional = false
source = "crates.io"

[[dependencies]]
name = "uuid"
version = "1.17.0"
features = ["v4", "v7", "serde"]
optional = false
source = "crates.io"

[[dependencies]]
name = "chrono"
version = "0.4.41"
features = ["serde", "clock"]
optional = false
source = "crates.io"

[[dependencies]]
name = "jsonwebtoken"
version = "9.3.1"
features = []
optional = false
source = "crates.io"

[[dependencies]]
name = "tower"
version = "0.5.2"
features = ["timeout", "limit", "load-shed", "retry", "buffer"]
optional = false
source = "crates.io"`,
    },
  },
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type Tab = 'compare' | 'encode' | 'decode'

const activeTab = ref<Tab>('compare')
const inputFormat = ref<InputFormat>('json')
const inputText = ref('')
const selectedPreset = ref('event_logs')
const copied = ref<string>('')
const shareText = ref('')
const showSession = ref(false)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  return Math.floor(new TextEncoder().encode(text.trim()).length / 4)
}

function jsonFromPayloadObj(obj: any): Payload {
  return {
    tool: obj.tool ?? '',
    tokenBudget: obj.tokenBudget ?? 0,
    tokensUsed: obj.tokensUsed ?? 0,
    packRoot: obj.packRoot ?? '',
    symbols: (obj.symbols ?? []).map((s: any) => ({
      qualifiedName: s.qualifiedName,
      kind: s.kind,
      score: s.score,
      provenance: s.provenance,
      distance: s.distance ?? 0,
    })),
    edges: (obj.edges ?? []).map((e: any) => ({
      source: e.source,
      target: e.target,
      edgeType: e.edgeType,
      status: e.status ?? '',
    })),
  }
}

// ---------------------------------------------------------------------------
// Computed: three-way encode
// ---------------------------------------------------------------------------

function parseInput(text: string, format: InputFormat): any {
  if (!text.trim()) return null
  try {
    if (format === 'json') return JSON.parse(text)
    if (format === 'yaml') return jsYaml.load(text)
    if (format === 'toml') return tomlParse(text)
  } catch { return null }
  return null
}

const parsedObj = computed(() => parseInput(inputText.value, inputFormat.value))

const parseError = computed(() => {
  if (!inputText.value.trim()) return ''
  if (parsedObj.value !== null) return ''
  const labels: Record<InputFormat, string> = { json: 'JSON', yaml: 'YAML', toml: 'TOML', csv: 'CSV' }
  return `Invalid ${labels[inputFormat.value]}`
})

const jsonOutput = computed(() => {
  if (!parsedObj.value) return ''
  return JSON.stringify(parsedObj.value, null, 2)
})

const toonOutput = computed(() => {
  if (!parsedObj.value) return ''
  try { return encodeTOON(parsedObj.value) }
  catch { return '' }
})

const toonError = computed(() => {
  if (!parsedObj.value) return ''
  if (inputFormat.value === 'json') return ''
  const labels: Record<InputFormat, string> = { json: '', yaml: 'YAML', toml: 'TOML', csv: 'CSV' }
  return labels[inputFormat.value]
})

const isPayload = computed(() => parsedObj.value ? isPayloadShaped(parsedObj.value) : false)

const gcfOutput = computed(() => {
  if (!parsedObj.value) return ''
  try {
    if (isPayload.value) {
      return encode(jsonFromPayloadObj(parsedObj.value))
    }
    return encodeGeneric(parsedObj.value)
  } catch { return '' }
})

const sessionOutput = computed(() => {
  if (!parsedObj.value || !isPayload.value) return ''
  try { return encodeSessionCall2(parsedObj.value) }
  catch { return '' }
})

const gcfHighlighted = computed(() => {
  if (!highlightFn.value || !gcfOutput.value) return ''
  return highlightFn.value(gcfOutput.value)
})
const jsonHighlighted = computed(() => {
  if (!highlightJsonFn.value || !jsonOutput.value) return ''
  return highlightJsonFn.value(jsonOutput.value)
})
const toonHighlighted = computed(() => {
  if (!highlightToonFn.value || !toonOutput.value) return ''
  return highlightToonFn.value(toonOutput.value)
})
const encodeHighlighted = computed(() => {
  if (!highlightFn.value || !encodeOutput.value || encodeError.value) return ''
  return highlightFn.value(encodeOutput.value)
})

const inputTokens = computed(() => inputText.value.trim() ? estimateTokens(inputText.value) : 0)
const jsonTokens = computed(() => estimateTokens(jsonOutput.value))
const toonTokens = computed(() => estimateTokens(toonOutput.value))
const gcfTokens = computed(() => estimateTokens(gcfOutput.value))
const sessionTokens = computed(() => estimateTokens(sessionOutput.value))

const gcfVsJson = computed(() => jsonTokens.value > 0 ? Math.round(100 * (1 - gcfTokens.value / jsonTokens.value)) : 0)
const gcfVsToon = computed(() => toonTokens.value > 0 ? Math.round(100 * (1 - gcfTokens.value / toonTokens.value)) : 0)
const gcfVsSource = computed(() => inputTokens.value > 0 ? Math.round(100 * (1 - gcfTokens.value / inputTokens.value)) : 0)
const sessionVsJson = computed(() => jsonTokens.value > 0 ? Math.round(100 * (1 - sessionTokens.value / jsonTokens.value)) : 0)
const isNonJson = computed(() => inputFormat.value !== 'json')

const symbolCount = computed(() => parsedObj.value?.symbols?.length ?? 0)
const edgeCount = computed(() => parsedObj.value?.edges?.length ?? 0)
const dataMeta = computed(() => {
  if (!parsedObj.value) return ''
  if (isPayload.value) return `${symbolCount.value} symbols, ${edgeCount.value} edges`
  const json = JSON.stringify(parsedObj.value)
  const keys = Object.keys(parsedObj.value)
  return `${keys.length} top-level keys, ${json.length} bytes JSON`
})

// Savings breakdown
const symbolOnlyTokensJson = computed(() => {
  if (!parsedObj.value) return 0
  const noEdges = { ...parsedObj.value, edges: [] }
  return estimateTokens(JSON.stringify(noEdges, null, 2))
})
const symbolOnlyTokensGcf = computed(() => {
  if (!parsedObj.value) return 0
  try {
    const noEdges = jsonFromPayloadObj({ ...parsedObj.value, edges: [] })
    return estimateTokens(encode(noEdges))
  } catch { return 0 }
})
const edgeSavingsPercent = computed(() => {
  const jsonEdgeCost = jsonTokens.value - symbolOnlyTokensJson.value
  const gcfEdgeCost = gcfTokens.value - symbolOnlyTokensGcf.value
  if (jsonEdgeCost <= 0) return 0
  return Math.round(100 * (1 - gcfEdgeCost / jsonEdgeCost))
})
const symbolSavingsPercent = computed(() => {
  if (symbolOnlyTokensJson.value <= 0) return 0
  return Math.round(100 * (1 - symbolOnlyTokensGcf.value / symbolOnlyTokensJson.value))
})

// Bar widths (relative to largest format as 100%)
const barMax = computed(() => Math.max(jsonTokens.value, inputTokens.value, toonTokens.value || 0))
const sourceBarPct = computed(() => barMax.value > 0 ? Math.round((inputTokens.value / barMax.value) * 100) : 0)
const jsonBarPct = computed(() => barMax.value > 0 ? Math.round((jsonTokens.value / barMax.value) * 100) : 0)
const toonBarPct = computed(() => barMax.value > 0 ? Math.round((toonTokens.value / barMax.value) * 100) : 0)
const gcfBarPct = computed(() => barMax.value > 0 ? Math.round((gcfTokens.value / barMax.value) * 100) : 0)
const sessionBarPct = computed(() => barMax.value > 0 ? Math.round((sessionTokens.value / barMax.value) * 100) : 0)

// ---------------------------------------------------------------------------
// Encode tab
// ---------------------------------------------------------------------------

const encodeFormat = ref<EncodeFormat>('json')
const encodeInput = ref('')

const ENCODE_PRESETS: Partial<Record<EncodeFormat, Record<string, { label: string; text: string }>>> = {
  msgpack: {
    msgpack_users: {
      label: 'User records (8 rows)',
      text: 'gaV1c2Vyc5iFomlkAaRuYW1lq0FsaWNlIFNtaXRopHJvbGWlYWRtaW6mYWN0aXZlw6VzY29yZctAV6AAAAAAAIWiaWQCpG5hbWWpQm9iIEpvbmVzpHJvbGWmZWRpdG9ypmFjdGl2ZcOlc2NvcmXLQFXMzMzMzM2FomlkA6RuYW1lqENhcm9sIFd1pHJvbGWmdmlld2VypmFjdGl2ZcKlc2NvcmXLQFIGZmZmZmaFomlkBKRuYW1lp0RhbiBMZWWkcm9sZaZlZGl0b3KmYWN0aXZlw6VzY29yZctAVvMzMzMzM4WiaWQFpG5hbWWoRXZlIFBhcmukcm9sZaVhZG1pbqZhY3RpdmXDpXNjb3Jly0BYEzMzMzMzhaJpZAakbmFtZapGcmFuayBDaGVupHJvbGWmdmlld2VypmFjdGl2ZcOlc2NvcmXLQFEZmZmZmZqFomlkB6RuYW1lqUdyYWNlIEtpbaRyb2xlpmVkaXRvcqZhY3RpdmXCpXNjb3Jly0BL8zMzMzMzhaJpZAikbmFtZapIYW5rIERhdmlzpHJvbGWlYWRtaW6mYWN0aXZlw6VzY29yZctAVizMzMzMzQ==',
    },
    msgpack_metrics: {
      label: 'API metrics (8 endpoints)',
      text: 'g6dzZXJ2aWNlq2FwaS1nYXRld2F5qXRpbWVzdGFtcLQyMDI2LTA2LTA1VDE4OjAwOjAwWqhyZXF1ZXN0c5iGpHBhdGiqL2FwaS91c2Vyc6ZtZXRob2SjR0VUpWNvdW50zQYGpmF2Z19tc8tARpmZmZmZmqZwOTlfbXPLQHOIAAAAAACmZXJyb3JzA4akcGF0aKovYXBpL3VzZXJzpm1ldGhvZKRQT1NUpWNvdW50zQEfpmF2Z19tc8tAXjMzMzMzM6ZwOTlfbXPLQIvQzMzMzM2mZXJyb3JzDIakcGF0aK0vYXBpL3Byb2R1Y3Rzpm1ldGhvZKNHRVSlY291bnTNDzOmYXZnX21zy0A3ZmZmZmZmpnA5OV9tc8tAY5ZmZmZmZqZlcnJvcnMAhqRwYXRoqy9hcGkvb3JkZXJzpm1ldGhvZKNHRVSlY291bnTNA7ymYXZnX21zy0BQ0zMzMzMzpnA5OV9tc8tAe9MzMzMzM6ZlcnJvcnMHhqRwYXRoqy9hcGkvb3JkZXJzpm1ldGhvZKRQT1NUpWNvdW50zQGcpmF2Z19tc8tAbUMzMzMzM6ZwOTlfbXPLQJLCAAAAAACmZXJyb3JzFYakcGF0aKkvYXBpL2F1dGimbWV0aG9kpFBPU1SlY291bnTNCDemYXZnX21zy0AvMzMzMzMzpnA5OV9tc8tAVlMzMzMzM6ZlcnJvcnMthqRwYXRoqy9hcGkvc2VhcmNopm1ldGhvZKNHRVSlY291bnTNBo6mYXZnX21zy0BWbMzMzMzNpnA5OV9tc8tAgb5mZmZmZqZlcnJvcnMChqRwYXRoqy9hcGkvaGVhbHRopm1ldGhvZKNHRVSlY291bnTNIcCmYXZnX21zyz/zMzMzMzMzpnA5OV9tc8tAFZmZmZmZmqZlcnJvcnMA',
    },
  },
}

const encodePresets = computed(() => {
  const fp = ENCODE_PRESETS[encodeFormat.value]
  if (!fp) return []
  return Object.entries(fp).map(([key, p]) => ({ key, label: p.label }))
})

const selectedEncodePreset = ref('')

function loadEncodePreset(key: string) {
  const fp = ENCODE_PRESETS[encodeFormat.value]
  if (fp && fp[key]) {
    encodeInput.value = fp[key].text
  }
}

function onEncodeFormatChange() {
  const presets = encodePresets.value
  if (presets.length > 0) {
    selectedEncodePreset.value = presets[0].key
    loadEncodePreset(presets[0].key)
  } else {
    encodeInput.value = ''
    selectedEncodePreset.value = ''
  }
}

function parseEncodeInput(text: string, format: EncodeFormat): any {
  if (!text.trim()) return null
  try {
    if (format === 'json') return JSON.parse(text)
    if (format === 'yaml') return jsYaml.load(text)
    if (format === 'toml') return tomlParse(text)
    if (format === 'csv') {
      const result = Papa.parse(text.trim(), { header: true, dynamicTyping: true, skipEmptyLines: true })
      return result.data
    }
    if (format === 'msgpack') {
      const bytes = base64ToUint8Array(text)
      return msgpackDecode(bytes)
    }
  } catch { return null }
  return null
}

const encodeParsed = computed(() => parseEncodeInput(encodeInput.value, encodeFormat.value))
const encodeParseError = computed(() => {
  if (!encodeInput.value.trim()) return ''
  if (encodeParsed.value !== null) return ''
  const labels: Record<EncodeFormat, string> = { json: 'JSON', yaml: 'YAML', toml: 'TOML', csv: 'CSV', msgpack: 'MessagePack (base64)' }
  return `Invalid ${labels[encodeFormat.value]}`
})
const encodeIsPayload = computed(() => encodeParsed.value ? isPayloadShaped(encodeParsed.value) : false)
const encodeOutput = computed(() => {
  if (!encodeParsed.value) return ''
  try {
    if (encodeIsPayload.value) {
      return encode(jsonFromPayloadObj(encodeParsed.value))
    }
    return encodeGeneric(encodeParsed.value)
  } catch (e: any) {
    return `Error: ${e.message ?? e}`
  }
})
const encodeError = computed(() => encodeOutput.value.startsWith('Error:'))
const encodeInputTokens = computed(() => encodeInput.value.trim() ? estimateTokens(encodeInput.value) : 0)
const encodeGcfTokens = computed(() => encodeOutput.value && !encodeError.value ? estimateTokens(encodeOutput.value) : 0)
const encodeSavings = computed(() => encodeInputTokens.value > 0 ? Math.round(100 * (1 - encodeGcfTokens.value / encodeInputTokens.value)) : 0)

// ---------------------------------------------------------------------------
// Decode tab
// ---------------------------------------------------------------------------

const decodeFormat = ref<DecodeFormat>('json')
const decodeInput = ref('')
const selectedDecodePreset = ref('')

const DECODE_PRESETS: Record<string, { label: string; text: string }> = {
  decode_users: {
    label: 'User records (8 rows)',
    text: `GCF profile=generic
## users [8]{id,name,role,active,score}
1|Alice Smith|admin|true|94.5
2|Bob Jones|editor|true|87.2
3|Carol Wu|viewer|false|72.1
4|Dan Lee|editor|true|91.8
5|Eve Park|admin|true|96.3
6|Frank Chen|viewer|true|68.4
7|Grace Kim|editor|false|55.9
8|Hank Davis|admin|true|88.7
`,
  },
  decode_metrics: {
    label: 'API metrics (8 endpoints)',
    text: `GCF profile=generic
service=api-gateway
timestamp=2026-06-05T18:00:00Z
## requests [8]{path,method,count,avg_ms,p99_ms,errors}
/api/users|GET|1542|45.2|312.5|3
/api/users|POST|287|120.8|890.1|12
/api/products|GET|3891|23.4|156.7|0
/api/orders|GET|956|67.3|445.2|7
/api/orders|POST|412|234.1|1200.5|21
/api/auth|POST|2103|15.6|89.3|45
/api/search|GET|1678|89.7|567.8|2
/api/health|GET|8640|1.2|5.4|0
`,
  },
}

function loadDecodePreset(key: string) {
  if (DECODE_PRESETS[key]) {
    decodeInput.value = DECODE_PRESETS[key].text
  }
}

function formatDecodeOutput(value: any, format: DecodeFormat): string {
  try {
    if (format === 'json') return JSON.stringify(value, null, 2)
    if (format === 'yaml') return jsYaml.dump(value, { lineWidth: -1, noRefs: true })
    if (format === 'toml') return tomlStringify(value)
    if (format === 'csv') {
      if (Array.isArray(value)) return Papa.unparse(value)
      return Papa.unparse([value])
    }
    if (format === 'msgpack') {
      const bytes = msgpackEncode(value)
      return uint8ArrayToBase64(new Uint8Array(bytes))
    }
  } catch (e: any) {
    return `Error: cannot represent as ${format.toUpperCase()}: ${e.message ?? e}`
  }
  return ''
}

const decodeOutput = computed(() => {
  if (!decodeInput.value.trim()) return ''
  try {
    const result = decodeGeneric(decodeInput.value)
    return formatDecodeOutput(result, decodeFormat.value)
  } catch (e: any) {
    return `Error: ${e.message ?? e}`
  }
})

const decodeError = computed(() => decodeOutput.value.startsWith('Error:'))

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function loadPreset(key: string) {
  if (inputFormat.value === 'json') {
    if (PRESETS[key]) {
      inputText.value = JSON.stringify(PRESETS[key].json, null, 2)
    }
  } else {
    const fp = FORMAT_PRESETS[inputFormat.value]
    if (fp && fp[key]) {
      inputText.value = fp[key].text
    }
  }
}

const currentPresets = computed(() => {
  if (inputFormat.value === 'json') {
    return Object.entries(PRESETS).map(([key, p]) => ({ key, label: p.label }))
  }
  const fp = FORMAT_PRESETS[inputFormat.value] || {}
  return Object.entries(fp).map(([key, p]) => ({ key, label: p.label }))
})

function onFormatChange() {
  const presets = currentPresets.value
  if (presets.length > 0) {
    selectedPreset.value = presets[0].key
    loadPreset(presets[0].key)
  } else {
    inputText.value = ''
    selectedPreset.value = ''
  }
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text)
  copied.value = label
  setTimeout(() => { copied.value = '' }, 1500)
}

function shareUrl() {
  const params = new URLSearchParams()
  params.set('tab', activeTab.value)
  if (activeTab.value === 'compare') {
    params.set('input', inputText.value)
    if (showSession.value) params.set('session', '1')
  } else if (activeTab.value === 'encode') {
    params.set('json', encodeInput.value)
  } else {
    params.set('gcf', decodeInput.value)
  }
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
  navigator.clipboard.writeText(url)
  shareText.value = 'Copied!'
  setTimeout(() => { shareText.value = '' }, 1500)
}

// ---------------------------------------------------------------------------
// Watchers & Init
// ---------------------------------------------------------------------------

onMounted(async () => {
  // Init tree-sitter parser for GCF highlighting (client-side only)
  try {
    const mod = await import('../gcf-highlight')
    await mod.initParser()
    highlightFn.value = mod.highlightGCF
    highlightJsonFn.value = mod.highlightJSON
    highlightToonFn.value = mod.highlightTOON
  } catch (e) {
    console.warn('GCF syntax highlighting unavailable:', e)
  }

  const params = new URLSearchParams(window.location.search)
  if (params.get('tab') === 'encode') {
    activeTab.value = 'encode'
    const json = params.get('json')
    if (json) encodeInput.value = json
  } else if (params.get('tab') === 'decode') {
    activeTab.value = 'decode'
    const gcf = params.get('gcf')
    if (gcf) decodeInput.value = gcf
  } else {
    const input = params.get('input')
    if (input) {
      inputText.value = input
    } else {
      const preset = params.get('preset')
      if (preset && PRESETS[preset]) {
        selectedPreset.value = preset
        loadPreset(preset)
      } else {
        loadPreset('event_logs')
      }
    }
    if (params.get('session') === '1') showSession.value = true
  }
})
</script>

<template>
  <div class="pg">
    <header class="pg-header">
      <h1>Playground</h1>
      <p class="pg-subtitle">Paste any structured data and see how GCF compares. JSON, YAML, TOML, CSV: GCF encodes them all.</p>
    </header>

    <!-- Tab bar -->
    <div class="pg-controls">
      <div class="pg-tabs">
        <button :class="['pg-tab', { active: activeTab === 'compare' }]" @click="activeTab = 'compare'">
          Compare Formats
        </button>
        <button :class="['pg-tab', { active: activeTab === 'encode' }]" @click="activeTab = 'encode'">
          Encode to GCF
        </button>
        <button :class="['pg-tab', { active: activeTab === 'decode' }]" @click="activeTab = 'decode'">
          Decode GCF
        </button>
      </div>

      <div class="pg-controls-right">
        <template v-if="activeTab === 'compare'">
          <select v-model="inputFormat" class="pg-select pg-format-select" @change="onFormatChange()">
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="toml">TOML</option>
          </select>
          <select v-model="selectedPreset" class="pg-select" @change="loadPreset(selectedPreset)">
            <option value="" disabled>Load example...</option>
            <option v-for="p in currentPresets" :key="p.key" :value="p.key">{{ p.label }}</option>
          </select>
          <label class="pg-checkbox">
            <input type="checkbox" v-model="showSession" />
            Show session dedup
          </label>
        </template>
        <button class="pg-share" @click="shareUrl">{{ shareText || 'Share' }}</button>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- COMPARE TAB: Three-column layout                                  -->
    <!-- ================================================================= -->
    <template v-if="activeTab === 'compare'">
      <div class="triple-pane">
        <!-- Input (editable) -->
        <div class="pane pane-json">
          <div class="pane-head">
            <span class="pane-label">{{ inputFormat.toUpperCase() }}</span>
            <span class="pane-tokens">{{ inputTokens.toLocaleString() }} tokens</span>
          </div>
          <textarea
            class="pane-textarea"
            v-model="inputText"
            spellcheck="false"
            :placeholder="`Paste any ${inputFormat.toUpperCase()} here, or load an example above...`"
          ></textarea>
          <div class="input-error" v-if="parseError">{{ parseError }}</div>
        </div>

        <!-- TOON -->
        <div class="pane pane-toon">
          <div class="pane-head" :class="{ 'pane-head-error': toonError }">
            <span class="pane-label">TOON</span>
            <span class="pane-tokens" v-if="toonOutput && !toonError">{{ toonTokens.toLocaleString() }} tokens</span>
            <span class="pane-unsupported" v-if="toonError">unsupported</span>
          </div>
          <div class="pane-body-wrap" v-if="toonError && parsedObj">
            <div class="toon-error-state">
              <div class="toon-error-icon">&#x2717;</div>
              <div class="toon-error-title">TOON cannot encode {{ toonError }}</div>
              <div class="toon-error-detail">
                TOON accepts JSON objects only. To encode {{ toonError }} data, you would
                first convert to JSON, then encode with TOON. GCF encodes the parsed
                structured data directly, regardless of source format.
              </div>
              <div class="toon-error-verified">
                GCF encodes any structured data, regardless of source format.
                Verified lossless across 43B+ round-trips in JSON, YAML, TOML, CSV, and MessagePack.
              </div>
            </div>
          </div>
          <div class="pane-body-wrap" v-else>
            <button v-if="toonOutput" class="pane-copy" @click="copyText(toonOutput, 'toon')">{{ copied === 'toon' ? 'Copied!' : 'Copy' }}</button>
            <pre class="pane-code" v-if="toonHighlighted" v-html="toonHighlighted"></pre>
            <pre class="pane-code" v-else>{{ toonOutput || 'TOON output will appear here...' }}</pre>
          </div>
        </div>

        <!-- GCF -->
        <div class="pane pane-gcf">
          <div class="pane-head pane-head-gcf">
            <span class="pane-label">GCF</span>
            <span class="pane-tokens" v-if="gcfOutput">{{ gcfTokens.toLocaleString() }} tokens</span>
          </div>
          <div class="pane-body-wrap">
            <button v-if="gcfOutput" class="pane-copy" @click="copyText(gcfOutput, 'gcf')">{{ copied === 'gcf' ? 'Copied!' : 'Copy' }}</button>
            <pre class="pane-code" v-if="gcfHighlighted" v-html="gcfHighlighted"></pre>
            <pre class="pane-code" v-else>{{ gcfOutput || 'GCF output will appear here...' }}</pre>
          </div>
        </div>
      </div>

      <!-- Session dedup pane -->
      <div v-if="showSession && gcfOutput" class="session-section">
        <div class="session-header">
          <h3>Session Deduplication: 2nd tool call</h3>
          <p class="session-desc">
            All {{ symbolCount }} symbols were sent in the first call. On the second call,
            they become bare references. TOON and JSON have no equivalent.
          </p>
        </div>
        <div class="session-pane">
          <div class="pane-head pane-head-gcf">
            <span class="pane-label">GCF (2nd call)</span>
            <span class="pane-tokens">{{ sessionTokens.toLocaleString() }} tokens</span>
          </div>
          <div class="pane-body-wrap">
            <button class="pane-copy" @click="copyText(sessionOutput, 'session')">{{ copied === 'session' ? 'Copied!' : 'Copy' }}</button>
            <pre class="pane-code">{{ sessionOutput }}</pre>
          </div>
        </div>
      </div>

      <!-- Token comparison bars -->
      <div class="bars-section" v-if="gcfOutput">
        <h3 class="bars-title">Token Comparison</h3>
        <div class="bars-meta">{{ dataMeta }}</div>

        <!-- Source format bar (only when not JSON) -->
        <div class="bar-row" v-if="isNonJson">
          <span class="bar-label bar-label-long">{{ inputFormat.toUpperCase() }}</span>
          <div class="bar-track"><div class="bar-fill bar-source" :style="{ width: sourceBarPct + '%' }"></div></div>
          <span class="bar-val">{{ inputTokens.toLocaleString() }}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label" :class="{ 'bar-label-long': isNonJson }">JSON</span>
          <div class="bar-track"><div class="bar-fill bar-json" :style="{ width: jsonBarPct + '%' }"></div></div>
          <span class="bar-val">{{ jsonTokens.toLocaleString() }}</span>
        </div>
        <div class="bar-row" v-if="!toonError">
          <span class="bar-label" :class="{ 'bar-label-long': isNonJson }">TOON</span>
          <div class="bar-track"><div class="bar-fill bar-toon" :style="{ width: toonBarPct + '%' }"></div></div>
          <span class="bar-val">{{ toonTokens.toLocaleString() }}</span>
        </div>
        <div class="bar-row" v-if="toonError">
          <span class="bar-label bar-label-long">TOON</span>
          <div class="bar-track bar-track-error"><span class="bar-error-text">cannot encode {{ toonError }}</span></div>
          <span class="bar-val">N/A</span>
        </div>
        <div class="bar-row">
          <span class="bar-label" :class="{ 'bar-label-long': isNonJson }">GCF</span>
          <div class="bar-track"><div class="bar-fill bar-gcf" :style="{ width: gcfBarPct + '%' }"></div></div>
          <span class="bar-val">{{ gcfTokens.toLocaleString() }}</span>
        </div>
        <div class="bar-row" v-if="showSession">
          <span class="bar-label bar-label-long">GCF 2nd</span>
          <div class="bar-track"><div class="bar-fill bar-session" :style="{ width: sessionBarPct + '%' }"></div></div>
          <span class="bar-val">{{ sessionTokens.toLocaleString() }}</span>
        </div>

        <!-- Savings summary -->
        <div class="savings-grid">
          <div class="savings-card" v-if="isNonJson && gcfVsSource > 0">
            <div class="savings-number">{{ gcfVsSource }}%</div>
            <div class="savings-label">fewer tokens vs {{ inputFormat.toUpperCase() }}</div>
          </div>
          <div class="savings-card">
            <div class="savings-number">{{ gcfVsJson }}%</div>
            <div class="savings-label">fewer tokens vs JSON</div>
          </div>
          <div class="savings-card" v-if="!toonError">
            <div class="savings-number">{{ gcfVsToon }}%</div>
            <div class="savings-label">fewer tokens vs TOON</div>
          </div>
          <div class="savings-card savings-card-error" v-if="toonError">
            <div class="savings-number savings-number-error">N/A</div>
            <div class="savings-label">TOON: cannot encode {{ inputFormat.toUpperCase() }}</div>
          </div>
          <div class="savings-card" v-if="showSession">
            <div class="savings-number">{{ sessionVsJson }}%</div>
            <div class="savings-label">savings on 2nd call vs JSON</div>
          </div>
        </div>

        <!-- Comprehension note -->
        <div class="comprehension-note">
          <strong>100% comprehension on every frontier model tested.</strong> Claude, GPT-5.5, Gemini: all read GCF natively with zero format instructions on standard workloads (500 orders, nested data). On adversarial workloads (500-symbol code graphs), GCF still scores <strong>91.6%</strong> where TOON drops to 66.9% and JSON to 54.6%. Human readability is a last-mile concern: call <code>decode()</code> when a human needs to see it.
          <div class="comprehension-punchline">The "readable" formats are the ones that break.</div>
          <a href="/guide/benchmarks">See the benchmarks &rarr;</a>
        </div>

        <!-- Breakdown -->
        <div class="breakdown" v-if="edgeCount > 0">
          <h4 class="breakdown-title">Where the savings come from</h4>
          <div class="breakdown-row">
            <span class="breakdown-label">Symbol encoding (positional fields, kind abbreviation)</span>
            <span class="breakdown-val">{{ symbolSavingsPercent }}% smaller</span>
          </div>
          <div class="breakdown-row">
            <span class="breakdown-label">Edge encoding (local IDs vs repeated qualified names)</span>
            <span class="breakdown-val breakdown-val-highlight">{{ edgeSavingsPercent }}% smaller</span>
          </div>
          <p class="breakdown-note">
            TOON has no local-ID system. Every edge repeats the full qualified name of both source
            and target. GCF edges cost ~4 tokens each regardless of identifier length.
          </p>
        </div>
      </div>
    </template>

    <!-- ================================================================= -->
    <!-- ENCODE TAB                                                        -->
    <!-- ================================================================= -->
    <template v-if="activeTab === 'encode'">
      <div class="tab-format-bar">
        <span class="tab-format-label">Input format:</span>
        <select v-model="encodeFormat" class="pg-select pg-format-select" @change="onEncodeFormatChange()">
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
          <option value="toml">TOML</option>
          <option value="csv">CSV</option>
          <option value="msgpack">MessagePack (base64)</option>
        </select>
        <select v-if="encodePresets.length > 0" v-model="selectedEncodePreset" class="pg-select" @change="loadEncodePreset(selectedEncodePreset)">
          <option value="" disabled>Load example...</option>
          <option v-for="p in encodePresets" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
      </div>
      <div class="decode-panes">
        <div class="pane">
          <div class="pane-head">
            <span class="pane-label">{{ encodeFormat.toUpperCase() }} Input</span>
            <span class="pane-tokens" v-if="encodeInputTokens">{{ encodeInputTokens.toLocaleString() }} tokens</span>
          </div>
          <textarea
            class="decode-textarea"
            v-model="encodeInput"
            spellcheck="false"
            :placeholder="encodeFormat === 'msgpack' ? 'Paste base64-encoded MessagePack here...' : `Paste any ${encodeFormat.toUpperCase()} here...`"
          ></textarea>
          <div class="input-error" v-if="encodeParseError">{{ encodeParseError }}</div>
        </div>
        <div class="pane">
          <div class="pane-head pane-head-gcf">
            <span class="pane-label">GCF Output</span>
            <span class="pane-tokens" v-if="encodeOutput && !encodeError">{{ encodeGcfTokens.toLocaleString() }} tokens ({{ encodeSavings }}% fewer)</span>
          </div>
          <div class="pane-body-wrap">
            <button v-if="encodeOutput && !encodeError" class="pane-copy" @click="copyText(encodeOutput, 'encode')">{{ copied === 'encode' ? 'Copied!' : 'Copy' }}</button>
            <pre class="pane-code" v-if="encodeHighlighted" v-html="encodeHighlighted"></pre>
            <pre :class="['pane-code', { 'pane-error': encodeError }]" v-else>{{ encodeOutput || 'GCF output will appear here...' }}</pre>
          </div>
        </div>
      </div>
    </template>

    <!-- ================================================================= -->
    <!-- DECODE TAB                                                        -->
    <!-- ================================================================= -->
    <template v-if="activeTab === 'decode'">
      <div class="tab-format-bar">
        <span class="tab-format-label">Output format:</span>
        <select v-model="decodeFormat" class="pg-select pg-format-select">
          <option value="json">JSON</option>
          <option value="yaml">YAML</option>
          <option value="toml">TOML</option>
          <option value="csv">CSV</option>
          <option value="msgpack">MessagePack (base64)</option>
        </select>
        <select v-model="selectedDecodePreset" class="pg-select" @change="loadDecodePreset(selectedDecodePreset)">
          <option value="" disabled>Load GCF example...</option>
          <option v-for="(p, key) in DECODE_PRESETS" :key="key" :value="key">{{ p.label }}</option>
        </select>
      </div>
      <div class="decode-panes">
        <div class="pane">
          <div class="pane-head pane-head-gcf">
            <span class="pane-label">GCF Input</span>
          </div>
          <textarea
            class="decode-textarea"
            v-model="decodeInput"
            spellcheck="false"
            placeholder="Paste GCF text here..."
          ></textarea>
        </div>
        <div class="pane">
          <div class="pane-head">
            <span class="pane-label">{{ decodeFormat.toUpperCase() }} Output</span>
            <span class="pane-tokens" v-if="decodeOutput && !decodeError">{{ estimateTokens(decodeOutput).toLocaleString() }} tokens</span>
          </div>
          <div class="pane-body-wrap">
            <button v-if="decodeOutput && !decodeError" class="pane-copy" @click="copyText(decodeOutput, 'decode')">{{ copied === 'decode' ? 'Copied!' : 'Copy' }}</button>
            <pre class="pane-code" v-if="highlightJsonFn && decodeOutput && !decodeError && decodeFormat === 'json'" v-html="highlightJsonFn(decodeOutput)"></pre>
            <pre :class="['pane-code', { 'pane-error': decodeError }]" v-else>{{ decodeOutput || `${decodeFormat.toUpperCase()} output will appear here...` }}</pre>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pg {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}

.pg-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 4px;
}

.pg-subtitle {
  color: var(--vp-c-text-2);
  margin: 0 0 20px;
  font-size: 15px;
}

/* Controls */
.pg-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.pg-tabs {
  display: flex;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.pg-tab {
  padding: 7px 18px;
  font-size: 14px;
  font-weight: 500;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.pg-tab:not(:last-child) {
  border-right: 1px solid rgba(24, 190, 252, 0.1);
}

.pg-tab.active {
  background: var(--gcf-blue, #18befc);
  color: var(--vp-c-white);
}

.pg-tab:hover:not(.active) {
  background: rgba(24, 190, 252, 0.03);
}

.pg-controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pg-select {
  padding: 7px 12px;
  font-size: 14px;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.pg-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  user-select: none;
}

.pg-checkbox input {
  accent-color: var(--gcf-blue, #18befc);
}

.pg-share {
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.pg-share:hover {
  background: rgba(24, 190, 252, 0.03);
  color: var(--vp-c-text-1);
}

/* Editable JSON pane */
.pane-textarea {
  flex: 1;
  width: 100%;
  min-height: 300px;
  padding: 10px 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.55;
  border: none;
  outline: none;
  resize: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  tab-size: 2;
}

.pane-textarea::placeholder {
  color: var(--vp-c-text-3);
}

.input-error {
  padding: 4px 12px 6px;
  font-size: 12px;
  color: var(--vp-c-danger-1);
  background: rgba(24, 190, 252, 0.03);
  border-top: 1px solid rgba(24, 190, 252, 0.1);
}

/* Three-column panes */
.triple-pane {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

@media (max-width: 1024px) {
  .triple-pane { grid-template-columns: 1fr; }
}

.pane {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(24, 190, 252, 0.03);
  border-bottom: 1px solid rgba(24, 190, 252, 0.1);
}

.pane-head-gcf {
  background: color-mix(in srgb, var(--gcf-blue, #18befc) 10%, var(--vp-c-bg-soft));
}

.pane-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.pane-tokens {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
}

.pane-body-wrap {
  position: relative;
  flex: 1;
  max-height: 450px;
  overflow-y: auto;
}

.pane-copy {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 5px;
  background: rgba(24, 190, 252, 0.03);
  color: var(--vp-c-text-2);
  cursor: pointer;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.15s;
}

.pane-body-wrap:hover .pane-copy,
.pane-copy:focus {
  opacity: 1;
}

.pane-code {
  margin: 0;
  padding: 10px 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--vp-c-text-1);
}

.pane-error {
  color: var(--vp-c-danger-1);
}

/* Session section */
.session-section {
  margin-top: 20px;
}

.session-header h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
}

.session-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 10px;
}

.session-pane {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
  max-width: 700px;
}

.session-pane .pane-body-wrap {
  max-height: 350px;
}

/* Token bars */
.bars-section {
  margin-top: 28px;
  padding: 20px 24px;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 14px;
  background: rgba(24, 190, 252, 0.03);
}

.bars-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 2px;
}

.bars-meta {
  font-size: 13px;
  color: var(--vp-c-text-3);
  margin-bottom: 16px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
}

.bar-label {
  width: 38px;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  flex-shrink: 0;
  text-align: right;
}

.bar-label-long {
  width: 56px;
}

.bar-track {
  flex: 1;
  height: 22px;
  background: var(--vp-c-bg);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(24, 190, 252, 0.1);
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.35s ease;
}

.bar-source { background: #7c6f9b; }
.bar-json { background: var(--vp-c-text-3); }
.bar-toon { background: #e8912d; }
.bar-gcf { background: var(--gcf-blue, #18befc); }
.bar-session { background: var(--gcf-blue, #18befc); }

.bar-val {
  width: 60px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-2);
  text-align: right;
  flex-shrink: 0;
}

/* Savings cards */
.savings-grid {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.savings-card {
  flex: 1;
  min-width: 140px;
  padding: 14px 16px;
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
}

.savings-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--gcf-blue, #18befc);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.savings-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-top: 4px;
}

/* Breakdown */
.comprehension-note {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(24, 190, 252, 0.03);
  border-radius: 8px;
  font-size: 0.9em;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.comprehension-note strong {
  color: var(--vp-c-text-1);
}
.comprehension-note a {
  color: var(--gcf-blue, #18befc);
  text-decoration: none;
  font-weight: 500;
}
.comprehension-note code {
  background: var(--vp-c-bg-mute);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
.comprehension-punchline {
  margin-top: 10px;
  font-size: 1.1em;
  font-weight: 800;
  color: var(--gcf-blue, #18befc);
}

.breakdown {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(24, 190, 252, 0.1);
}

.breakdown-title {
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--vp-c-text-1);
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 5px 0;
  font-size: 13px;
}

.breakdown-label {
  color: var(--vp-c-text-2);
}

.breakdown-val {
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
  flex-shrink: 0;
  margin-left: 12px;
}

.breakdown-val-highlight {
  color: var(--gcf-blue, #18befc);
  font-size: 14px;
}

.breakdown-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
  line-height: 1.5;
}

/* Decode tab */
.decode-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .decode-panes { grid-template-columns: 1fr; }
}

.decode-textarea {
  flex: 1;
  min-height: 400px;
  padding: 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  border: none;
  outline: none;
  resize: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  tab-size: 2;
}

.decode-textarea::placeholder {
  color: var(--vp-c-text-3);
}

/* Tab format bar */
.tab-format-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.tab-format-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

/* Format selector */
.pg-format-select {
  font-weight: 600;
  min-width: 80px;
  border: 1.5px solid var(--gcf-blue, #18befc);
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.05);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.pg-format-select:hover {
  background: rgba(24, 190, 252, 0.1);
}

/* TOON error state */
.pane-head-error {
  background: color-mix(in srgb, var(--vp-c-danger-1) 8%, var(--vp-c-bg-soft));
  border-bottom-color: color-mix(in srgb, var(--vp-c-danger-1) 20%, rgba(24, 190, 252, 0.1));
}

.pane-unsupported {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-danger-1);
  background: color-mix(in srgb, var(--vp-c-danger-1) 12%, transparent);
  padding: 2px 8px;
  border-radius: 4px;
}

.toon-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  text-align: center;
  min-height: 250px;
}

.toon-error-icon {
  font-size: 36px;
  color: var(--vp-c-danger-1);
  opacity: 0.6;
  margin-bottom: 12px;
}

.toon-error-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-danger-1);
  margin-bottom: 10px;
}

.toon-error-detail {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  max-width: 320px;
}

.bar-track-error {
  flex: 1;
  height: 22px;
  background: color-mix(in srgb, var(--vp-c-danger-1) 8%, var(--vp-c-bg));
  border-radius: 4px;
  border: 1px dashed color-mix(in srgb, var(--vp-c-danger-1) 30%, rgba(24, 190, 252, 0.1));
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.bar-error-text {
  font-size: 11px;
  color: var(--vp-c-danger-1);
  opacity: 0.7;
  font-style: italic;
}

.savings-card-error {
  border-color: color-mix(in srgb, var(--vp-c-danger-1) 25%, rgba(24, 190, 252, 0.1));
  background: color-mix(in srgb, var(--vp-c-danger-1) 5%, var(--vp-c-bg));
}

.savings-number-error {
  color: var(--vp-c-danger-1) !important;
  font-size: 20px !important;
}

.toon-error-verified {
  margin-top: 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-danger-1);
  padding: 10px 14px;
  background: color-mix(in srgb, var(--vp-c-danger-1) 8%, var(--vp-c-bg-soft));
  border: 1px solid color-mix(in srgb, var(--vp-c-danger-1) 20%, rgba(24, 190, 252, 0.1));
  border-radius: 6px;
  max-width: 320px;
}
</style>
