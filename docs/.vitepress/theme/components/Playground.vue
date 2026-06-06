<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { encode, decode, encodeGeneric } from '@blackwell-systems/gcf'
import type { Payload } from '@blackwell-systems/gcf'
import { encode as toonEncode } from '@toon-format/toon'

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

  lines.push(`GCF tool=${obj.tool} budget=${obj.tokenBudget || 0} tokens=${obj.tokensUsed || 0} symbols=${syms.length} edges=${edges.length} session=true`)

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
  employees: {
    label: 'Employee records (20 rows, tabular)',
    json: {
      employees: [
        { id: 1, name: 'Alice Smith', department: 'Engineering', salary: 95000, active: true, location: 'New York', title: 'Senior Engineer' },
        { id: 2, name: 'Bob Jones', department: 'Sales', salary: 72000, active: true, location: 'Chicago', title: 'Account Executive' },
        { id: 3, name: 'Carol Wu', department: 'Marketing', salary: 85000, active: false, location: 'San Francisco', title: 'Marketing Manager' },
        { id: 4, name: 'Dan Lee', department: 'Engineering', salary: 91000, active: true, location: 'Austin', title: 'Staff Engineer' },
        { id: 5, name: 'Eve Park', department: 'Design', salary: 78000, active: true, location: 'Seattle', title: 'UX Designer' },
        { id: 6, name: 'Frank Chen', department: 'Engineering', salary: 105000, active: true, location: 'New York', title: 'Principal Engineer' },
        { id: 7, name: 'Grace Kim', department: 'Product', salary: 88000, active: true, location: 'San Francisco', title: 'Product Manager' },
        { id: 8, name: 'Hank Davis', department: 'Sales', salary: 68000, active: true, location: 'Chicago', title: 'Sales Rep' },
        { id: 9, name: 'Iris Wang', department: 'Engineering', salary: 97000, active: true, location: 'Austin', title: 'Senior Engineer' },
        { id: 10, name: 'Jack Brown', department: 'Design', salary: 82000, active: false, location: 'Seattle', title: 'Design Lead' },
        { id: 11, name: 'Kate Moore', department: 'Engineering', salary: 93000, active: true, location: 'New York', title: 'Senior Engineer' },
        { id: 12, name: 'Leo Patel', department: 'Marketing', salary: 76000, active: true, location: 'Chicago', title: 'Content Strategist' },
        { id: 13, name: 'Mia Lopez', department: 'Product', salary: 92000, active: true, location: 'San Francisco', title: 'Senior PM' },
        { id: 14, name: 'Noah Clark', department: 'Sales', salary: 71000, active: true, location: 'Austin', title: 'Account Executive' },
        { id: 15, name: 'Olivia Scott', department: 'Engineering', salary: 99000, active: true, location: 'Seattle', title: 'Staff Engineer' },
        { id: 16, name: 'Pete Adams', department: 'Design', salary: 80000, active: true, location: 'New York', title: 'UI Designer' },
        { id: 17, name: 'Quinn Hall', department: 'Engineering', salary: 101000, active: true, location: 'Austin', title: 'Tech Lead' },
        { id: 18, name: 'Rosa Diaz', department: 'Marketing', salary: 79000, active: true, location: 'Chicago', title: 'Growth Manager' },
        { id: 19, name: 'Sam Wilson', department: 'Product', salary: 86000, active: false, location: 'San Francisco', title: 'Product Analyst' },
        { id: 20, name: 'Tina Yang', department: 'Engineering', salary: 96000, active: true, location: 'Seattle', title: 'Senior Engineer' },
      ],
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
// State
// ---------------------------------------------------------------------------

type Tab = 'compare' | 'decode'

const activeTab = ref<Tab>('compare')
const inputText = ref('')
const selectedPreset = ref('employees')
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

const parsedObj = computed(() => {
  try { return JSON.parse(inputText.value) }
  catch { return null }
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

const jsonTokens = computed(() => estimateTokens(jsonOutput.value))
const toonTokens = computed(() => estimateTokens(toonOutput.value))
const gcfTokens = computed(() => estimateTokens(gcfOutput.value))
const sessionTokens = computed(() => estimateTokens(sessionOutput.value))

const gcfVsJson = computed(() => jsonTokens.value > 0 ? Math.round(100 * (1 - gcfTokens.value / jsonTokens.value)) : 0)
const gcfVsToon = computed(() => toonTokens.value > 0 ? Math.round(100 * (1 - gcfTokens.value / toonTokens.value)) : 0)
const sessionVsJson = computed(() => jsonTokens.value > 0 ? Math.round(100 * (1 - sessionTokens.value / jsonTokens.value)) : 0)

const symbolCount = computed(() => parsedObj.value?.symbols?.length ?? 0)
const edgeCount = computed(() => parsedObj.value?.edges?.length ?? 0)

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

// Bar widths (relative to JSON as 100%)
const toonBarPct = computed(() => jsonTokens.value > 0 ? Math.round((toonTokens.value / jsonTokens.value) * 100) : 0)
const gcfBarPct = computed(() => jsonTokens.value > 0 ? Math.round((gcfTokens.value / jsonTokens.value) * 100) : 0)
const sessionBarPct = computed(() => jsonTokens.value > 0 ? Math.round((sessionTokens.value / jsonTokens.value) * 100) : 0)

// ---------------------------------------------------------------------------
// Decode tab
// ---------------------------------------------------------------------------

const decodeInput = ref('')
const decodeOutput = computed(() => {
  if (!decodeInput.value.trim()) return ''
  try {
    const p = decode(decodeInput.value)
    return JSON.stringify({
      tool: p.tool,
      tokenBudget: p.tokenBudget,
      tokensUsed: p.tokensUsed,
      packRoot: p.packRoot ?? '',
      symbols: p.symbols.map(s => ({
        qualifiedName: s.qualifiedName,
        kind: s.kind,
        score: s.score,
        provenance: s.provenance,
        distance: s.distance,
      })),
      edges: p.edges.map(e => ({
        source: e.source,
        target: e.target,
        edgeType: e.edgeType,
        ...(e.status ? { status: e.status } : {}),
      })),
    }, null, 2)
  } catch (e: any) {
    return `Error: ${e.message ?? e}`
  }
})

const decodeError = computed(() => decodeOutput.value.startsWith('Error:'))

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function loadPreset(key: string) {
  inputText.value = JSON.stringify(PRESETS[key].json, null, 2)
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

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('tab') === 'decode') {
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
        loadPreset('blast_radius')
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
      <p class="pg-subtitle">Paste any JSON and see how GCF compares to JSON and TOON, in real time.</p>
    </header>

    <!-- Tab bar -->
    <div class="pg-controls">
      <div class="pg-tabs">
        <button :class="['pg-tab', { active: activeTab === 'compare' }]" @click="activeTab = 'compare'">
          Compare Formats
        </button>
        <button :class="['pg-tab', { active: activeTab === 'decode' }]" @click="activeTab = 'decode'">
          Decode GCF
        </button>
      </div>

      <div class="pg-controls-right">
        <template v-if="activeTab === 'compare'">
          <select v-model="selectedPreset" class="pg-select" @change="loadPreset(selectedPreset)">
            <option value="" disabled>Load example...</option>
            <option v-for="(p, key) in PRESETS" :key="key" :value="key">{{ p.label }}</option>
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
        <!-- JSON (editable) -->
        <div class="pane pane-json">
          <div class="pane-head">
            <span class="pane-label">JSON</span>
            <span class="pane-tokens">{{ jsonTokens.toLocaleString() }} tokens</span>
          </div>
          <textarea
            class="pane-textarea"
            v-model="inputText"
            spellcheck="false"
            placeholder="Paste any JSON here, or load an example above..."
          ></textarea>
          <div class="input-error" v-if="inputText.trim() && !parsedObj">Invalid JSON</div>
        </div>

        <!-- TOON -->
        <div class="pane pane-toon">
          <div class="pane-head">
            <span class="pane-label">TOON</span>
            <span class="pane-tokens" v-if="toonOutput">{{ toonTokens.toLocaleString() }} tokens</span>
          </div>
          <div class="pane-body-wrap">
            <button v-if="toonOutput" class="pane-copy" @click="copyText(toonOutput, 'toon')">{{ copied === 'toon' ? 'Copied!' : 'Copy' }}</button>
            <pre class="pane-code">{{ toonOutput || 'TOON output will appear here...' }}</pre>
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
            <pre class="pane-code">{{ gcfOutput || 'GCF output will appear here...' }}</pre>
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
        <div class="bars-meta">{{ symbolCount }} symbols, {{ edgeCount }} edges</div>

        <div class="bar-row">
          <span class="bar-label">JSON</span>
          <div class="bar-track"><div class="bar-fill bar-json" style="width: 100%"></div></div>
          <span class="bar-val">{{ jsonTokens.toLocaleString() }}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">TOON</span>
          <div class="bar-track"><div class="bar-fill bar-toon" :style="{ width: toonBarPct + '%' }"></div></div>
          <span class="bar-val">{{ toonTokens.toLocaleString() }}</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">GCF</span>
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
          <div class="savings-card">
            <div class="savings-number">{{ gcfVsJson }}%</div>
            <div class="savings-label">fewer tokens vs JSON</div>
          </div>
          <div class="savings-card">
            <div class="savings-number">{{ gcfVsToon }}%</div>
            <div class="savings-label">fewer tokens vs TOON</div>
          </div>
          <div class="savings-card" v-if="showSession">
            <div class="savings-number">{{ sessionVsJson }}%</div>
            <div class="savings-label">savings on 2nd call vs JSON</div>
          </div>
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
    <!-- DECODE TAB                                                        -->
    <!-- ================================================================= -->
    <template v-if="activeTab === 'decode'">
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
            <span class="pane-label">JSON Output</span>
            <span class="pane-tokens" v-if="decodeOutput && !decodeError">{{ estimateTokens(decodeOutput).toLocaleString() }} tokens</span>
          </div>
          <div class="pane-body-wrap">
            <button v-if="decodeOutput && !decodeError" class="pane-copy" @click="copyText(decodeOutput, 'decode')">{{ copied === 'decode' ? 'Copied!' : 'Copy' }}</button>
            <pre :class="['pane-code', { 'pane-error': decodeError }]">{{ decodeOutput || 'JSON output will appear here...' }}</pre>
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
  border: 1px solid var(--vp-c-border);
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
  border-right: 1px solid var(--vp-c-border);
}

.pg-tab.active {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.pg-tab:hover:not(.active) {
  background: var(--vp-c-bg-soft);
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
  border: 1px solid var(--vp-c-border);
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
  accent-color: var(--vp-c-brand-1);
}

.pg-share {
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.pg-share:hover {
  background: var(--vp-c-bg-soft);
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
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-border);
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
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
}

.pane-head-gcf {
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-bg-soft));
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
  border: 1px solid var(--vp-c-border);
  border-radius: 5px;
  background: var(--vp-c-bg-soft);
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
  border: 1px solid var(--vp-c-border);
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
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
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
  border: 1px solid var(--vp-c-border);
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.35s ease;
}

.bar-json { background: var(--vp-c-text-3); }
.bar-toon { background: #e8912d; }
.bar-gcf { background: var(--vp-c-brand-1); }
.bar-session { background: var(--vp-c-brand-2); }

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
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
}

.savings-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.savings-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-top: 4px;
}

/* Breakdown */
.breakdown {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--vp-c-border);
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
  color: var(--vp-c-brand-1);
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
</style>
