<script setup>
import { ref, computed, onMounted } from 'vue'
import { initParser, highlightGCF, highlightJSON } from '../gcf-highlight'

const ready = ref(false)
const current = ref(0)

const ordersJson = `{
  "orders": [
    {"id": 1001, "customer": "Acme Corp",
     "total": 49.99, "status": "shipped",
     "items": 1},
    {"id": 1002, "customer": "Globex Inc",
     "total": 150.49, "status": "pending",
     "items": 2},
    {"id": 1003, "customer": "Initech LLC",
     "total": 250.99, "status": "processing",
     "items": 3},`

const ordersFade = `    {"id": 1004, ...},
    {"id": 1005, ...},
    {"id": 1006, ...},
    {"id": 1007, ...},
    {"id": 1008, ...},
    {"id": 1009, ...},
    {"id": 1010, ...}
  ]
}`

const examples = [
  {
    key: 'records',
    label: 'Records',
    subtitle: 'Arrays of uniform records. Same data, fewer tokens, zero loss.',
    jsonCode: ordersJson,
    jsonFade: ordersFade,
    jsonTokens: 458,
    gcfCode: `GCF profile=generic
## orders [10]{id,customer,total,status,items}
1001|Acme Corp|49.99|shipped|1
1002|Globex Inc|150.49|pending|2
1003|Initech LLC|250.99|processing|3
1004|Umbrella Co|351.49|delivered|4
1005|Stark Ind|451.99|shipped|5
1006|Wayne Ent|552.49|pending|6
1007|Oscorp|652.99|shipped|7
1008|LexCorp|753.49|processing|8
1009|Cyberdyne|853.99|delivered|9
1010|Soylent|954.49|shipped|10`,
    gcfTokens: 177,
    savings: 61,
    savingsNote: 'Scales to 71%+ at production sizes.',
    footnote: '10 orders, 5 fields. Full payload, tiktoken cl100k.',
  },
  {
    key: 'graph',
    label: 'Code graph',
    subtitle: 'Code symbols and edges. The graph profile nothing else has.',
    jsonCode: `{
  "symbols": [
    {"qualified_name": "pkg.AuthMiddleware",
     "kind": "function", "score": 0.78,
     "provenance": "lsp_resolved", "distance": 0},
    {"qualified_name": "pkg.ValidateToken",
     "kind": "function", "score": 0.87,
     "provenance": "lsp_resolved", "distance": 0},`,
    jsonFade: `    {"qualified_name": "pkg.NewServer", ...},
    {"qualified_name": "pkg.Server.Start", ...},
    {"qualified_name": "pkg.Cache", ...}
  ],
  "edges": [
    {"source": "pkg.AuthMiddleware",
     "target": "pkg.ValidateToken", "type": "calls"},
    {"source": "pkg.NewServer", ...},
    {"source": "pkg.Server.Start", ...}
  ]
}`,
    jsonTokens: 344,
    gcfCode: `GCF profile=graph
## targets
@0 fn pkg.AuthMiddleware 0.78 lsp_resolved
@1 fn pkg.ValidateToken 0.87 lsp_resolved
## related
@2 fn pkg.NewServer 0.54 lsp_resolved
@3 method pkg.Server.Start 0.48 lsp_resolved
## extended
@4 type pkg.Cache 0.41 structural
## edges [3]
@1<@0 calls
@0<@2 calls
@2<@3 calls`,
    gcfTokens: 107,
    savings: 69,
    savingsNote: 'Local IDs and edges collapse the repetition.',
    footnote: '5 symbols, 3 edges, distance groups. Full payload, cl100k.',
  },
  {
    key: 'nested',
    label: 'Nested',
    subtitle: 'Nested objects, flattened to path columns.',
    jsonCode: `{
  "users": [
    {"id": 1, "name": "Alice",
     "address": {"city": "Portland",
                 "zip": "97201"}},
    {"id": 2, "name": "Bob",
     "address": {"city": "Austin",
                 "zip": "78701"}},
    {"id": 3, "name": "Carol",
     "address": {"city": "Denver",
                 "zip": "80202"}}
  ]
}`,
    jsonFade: '',
    jsonTokens: 129,
    gcfCode: `GCF profile=generic
## users [3]{id,name,address>city,address>zip}
1|Alice|Portland|97201
2|Bob|Austin|78701
3|Carol|Denver|80202`,
    gcfTokens: 46,
    savings: 64,
    savingsNote: 'Path columns replace repeated keys.',
    footnote: '3 records with nested objects. cl100k.',
  },
  {
    key: 'delta',
    label: 'Delta',
    subtitle: 'Re-query across a loop. Send only what changed.',
    jsonCode: ordersJson,
    jsonFade: ordersFade,
    jsonTokens: 458,
    gcfCode: `GCF profile=generic delta=true base_root=sha256:9f2a1c new_root=sha256:c17b04 key=id
## changed [1]{id,customer,total,status,items}
1002|Globex Inc|150.49|shipped|2
## added [1]{id,customer,total,status,items}
1011|Nakatomi|1055.00|pending|3
## removed [1]{id}
1007`,
    gcfTokens: 100,
    savings: 78,
    savingsNote: 'The whole array never moves again.',
    footnote: 'Re-query where 2 rows changed: JSON re-sends everything, GCF sends the diff. cl100k.',
  },
]

const ex = computed(() => examples[current.value])
const prev = () => { current.value = (current.value + examples.length - 1) % examples.length }
const next = () => { current.value = (current.value + 1) % examples.length }

onMounted(async () => {
  await initParser()
  ready.value = true
})
</script>

<template>
  <div class="ba-section">
    <div class="ba-inner">
      <h2 class="ba-title">See the Difference</h2>
      <p class="ba-subtitle">{{ ex.subtitle }}</p>

      <div class="ba-nav-row">
        <button class="ba-chevron" @click="prev" aria-label="Previous example">&lsaquo;</button>
        <div class="ba-tabs">
          <button
            v-for="(e, i) in examples"
            :key="e.key"
            class="ba-tab"
            :class="{ active: i === current }"
            @click="current = i"
          >{{ e.label }}</button>
        </div>
        <button class="ba-chevron" @click="next" aria-label="Next example">&rsaquo;</button>
      </div>

      <div class="ba-grid">
        <div class="ba-card json-card gcf-corners">
          <div class="ba-header">
            <span class="ba-dot json-dot"></span>
            <span class="ba-label">JSON</span>
            <span class="ba-badge json-badge">{{ ex.jsonTokens }} tokens</span>
          </div>
          <div class="ba-code-wrap">
            <pre class="ba-code"><code v-if="ready" v-html="highlightJSON(ex.jsonCode)"></code><code v-else>{{ ex.jsonCode }}</code></pre>
            <pre v-if="ex.jsonFade" class="ba-code ba-faded"><code>{{ ex.jsonFade }}</code></pre>
          </div>
        </div>

        <div class="ba-card gcf-card gcf-corners">
          <div class="ba-header">
            <span class="ba-dot gcf-dot"></span>
            <span class="ba-label">GCF</span>
            <span class="ba-badge gcf-badge">{{ ex.gcfTokens }} tokens</span>
          </div>
          <div class="ba-code-wrap">
            <pre class="ba-code"><code v-if="ready" v-html="highlightGCF(ex.gcfCode)"></code><code v-else>{{ ex.gcfCode }}</code></pre>
          </div>
        </div>
      </div>

      <div class="ba-savings">
        <div class="ba-savings-bar">
          <div class="ba-savings-fill" :style="{ width: ex.savings + '%' }"></div>
        </div>
        <p class="ba-savings-label"><span class="ba-highlight">{{ ex.savings }}% fewer tokens.</span> {{ ex.savingsNote }}</p>
      </div>

      <p class="ba-footnote">{{ ex.footnote }}</p>
    </div>
  </div>
</template>

<style scoped>
.ba-section {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px 0;
}

.ba-inner {
  text-align: center;
}

.ba-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.ba-subtitle {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0 0 20px;
  letter-spacing: 0.02em;
  min-height: 1.2em;
}

/* Carousel nav */
.ba-nav-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 0 28px;
}

.ba-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.ba-tab {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}

.ba-tab:hover {
  color: var(--vp-c-text-1);
  border-color: rgba(24, 190, 252, 0.3);
}

.ba-tab.active {
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.1);
  border-color: rgba(24, 190, 252, 0.4);
}

.ba-chevron {
  font-size: 1.4rem;
  line-height: 1;
  color: var(--vp-c-text-2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.2s, transform 0.2s;
}

.ba-chevron:hover {
  color: var(--gcf-blue, #18befc);
  transform: scale(1.2);
}

.ba-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  text-align: left;
}

.ba-card {
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.ba-card:hover {
  transform: translateY(-2px);
}

.json-card {
  background: rgba(178, 128, 128, 0.03);
  border: 1px solid rgba(178, 128, 128, 0.12);
}

.gcf-card {
  background: rgba(24, 190, 252, 0.03);
  border: 1px solid rgba(24, 190, 252, 0.12);
}

.ba-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.ba-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.json-dot {
  background: var(--json-color, #b28080);
  box-shadow: 0 0 8px rgba(178, 128, 128, 0.4);
}

.gcf-dot {
  background: var(--gcf-blue, #18befc);
  box-shadow: 0 0 8px rgba(24, 190, 252, 0.4);
}

.ba-label {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  flex: 1;
}

.json-card .ba-label {
  color: var(--json-color, #b28080);
}

.gcf-card .ba-label {
  color: var(--gcf-blue, #18befc);
}

.ba-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
}

.json-badge {
  color: var(--json-color, #b28080);
  background: rgba(178, 128, 128, 0.08);
}

.gcf-badge {
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.08);
}

.ba-code-wrap {
  padding: 16px 20px;
}

.ba-code {
  margin: 0;
  padding: 0;
  background: none;
  overflow-x: auto;
}

.ba-code code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
  white-space: pre;
}

.ba-faded {
  opacity: 0.25;
}

.gcf-card .ba-code code {
  color: rgba(255, 255, 255, 0.7);
}

/* Savings bar */
.ba-savings {
  margin-top: 28px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.ba-savings-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.ba-savings-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gcf-blue, #18befc), rgba(24, 190, 252, 0.4));
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.ba-savings-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.ba-highlight {
  color: var(--gcf-blue, #18befc);
  font-weight: 700;
}

.ba-footnote {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.18);
  margin-top: 12px;
  min-height: 1em;
}

@media (max-width: 640px) {
  .ba-grid {
    grid-template-columns: 1fr;
  }
}
</style>
