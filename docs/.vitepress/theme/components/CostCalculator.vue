<script setup lang="ts">
import { ref, computed } from 'vue'

const records = ref(500)
const queriesPerDay = ref(1000)
const sessionCalls = ref(1)
const showTokens = ref(false)

const models = [
  { name: 'Claude Mythos 5', input: 10.00, output: 50.00, provider: 'Anthropic' },
  { name: 'Claude Fable 5', input: 10.00, output: 50.00, provider: 'Anthropic' },
  { name: 'Claude Opus 4.8', input: 5.00, output: 25.00, provider: 'Anthropic' },
  { name: 'Claude Opus 4.6', input: 5.00, output: 25.00, provider: 'Anthropic' },
  { name: 'Claude Sonnet 4.6', input: 3.00, output: 15.00, provider: 'Anthropic' },
  { name: 'Claude Haiku 4.5', input: 1.00, output: 5.00, provider: 'Anthropic' },
  { name: 'GPT-5.5', input: 5.00, output: 30.00, provider: 'OpenAI' },
  { name: 'GPT-5.4', input: 2.50, output: 15.00, provider: 'OpenAI' },
  { name: 'GPT-4o mini', input: 0.15, output: 0.60, provider: 'OpenAI' },
  { name: 'Gemini 2.5 Pro', input: 1.25, output: 10.00, provider: 'Google' },
  { name: 'Gemini 2.5 Flash', input: 0.30, output: 2.50, provider: 'Google' },
  { name: 'Gemini 3.1 Pro', input: 2.00, output: 12.00, provider: 'Google' },
  { name: 'Grok 4.20', input: 2.00, output: 6.00, provider: 'xAI' },
  { name: 'Grok 4.3', input: 1.25, output: 2.50, provider: 'xAI' },
  { name: 'Grok 4.1 Fast', input: 0.20, output: 0.50, provider: 'xAI' },
  { name: 'Mistral Large 3', input: 0.50, output: 1.50, provider: 'Mistral' },
  { name: 'Mistral Medium 3', input: 0.40, output: 2.00, provider: 'Mistral' },
  { name: 'Mistral Small 4', input: 0.15, output: 0.60, provider: 'Mistral' },
  { name: 'Kimi 2.6', input: 0.95, output: 4.00, provider: 'Moonshot' },
  { name: 'Kimi K2.5', input: 0.60, output: 3.00, provider: 'Moonshot' },
  { name: 'Qwen 3.5 397B', input: 0.60, output: 3.60, provider: 'Alibaba' },
  { name: 'DeepSeek V3', input: 0.27, output: 1.10, provider: 'DeepSeek' },
]

const selectedModel = ref(4) // Claude Sonnet 4.6 default
const customCost = ref(0)
const useCustom = ref(false)
const costPerMillion = computed(() => useCustom.value ? customCost.value : models[selectedModel.value].input)

const tokensPerQuery = computed(() => {
  const r = records.value
  const ratio = r / 500
  const gcfBase = Math.round(23653 * ratio)
  const toonBase = Math.round(42151 * ratio)
  const jsonBase = Math.round(80653 * ratio)

  const sessionMultipliers = [1.0, 0.35, 0.20, 0.12, 0.08]
  const sessIdx = Math.min(sessionCalls.value - 1, 4)
  const gcfWithSession = Math.round(gcfBase * sessionMultipliers[sessIdx])

  return { gcf: gcfWithSession, toon: toonBase, json: jsonBase }
})

const monthlyCost = computed(() => {
  const monthlyQueries = queriesPerDay.value * 30
  const cpm = costPerMillion.value
  return {
    gcf: (tokensPerQuery.value.gcf * monthlyQueries / 1_000_000) * cpm,
    toon: (tokensPerQuery.value.toon * monthlyQueries / 1_000_000) * cpm,
    json: (tokensPerQuery.value.json * monthlyQueries / 1_000_000) * cpm,
  }
})

const annualSavings = computed(() => ({
  vsJson: (monthlyCost.value.json - monthlyCost.value.gcf) * 12,
  vsToon: (monthlyCost.value.toon - monthlyCost.value.gcf) * 12,
}))

const pctSaved = computed(() => ({
  vsJson: monthlyCost.value.json > 0 ? Math.round((1 - monthlyCost.value.gcf / monthlyCost.value.json) * 100) : 0,
  vsToon: monthlyCost.value.toon > 0 ? Math.round((1 - monthlyCost.value.gcf / monthlyCost.value.toon) * 100) : 0,
}))

const monthlyTokens = computed(() => {
  const monthlyQueries = queriesPerDay.value * 30
  return {
    gcf: (tokensPerQuery.value.gcf * monthlyQueries / 1_000_000).toFixed(1),
    toon: (tokensPerQuery.value.toon * monthlyQueries / 1_000_000).toFixed(1),
    json: (tokensPerQuery.value.json * monthlyQueries / 1_000_000).toFixed(1),
  }
})

// Bar widths relative to JSON (always 100%)
const barWidth = computed(() => {
  const j = monthlyCost.value.json
  if (j === 0) return { json: 100, toon: 100, gcf: 100 }
  return {
    json: 100,
    toon: Math.round((monthlyCost.value.toon / j) * 100),
    gcf: Math.round((monthlyCost.value.gcf / j) * 100),
  }
})

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="calculator">
    <h1 class="hero-title">How much is JSON costing you?</h1>
    <p class="subtitle">Plug in your numbers. See what you could save.</p>

    <div class="layout">
      <div class="left">
        <h3>Your Pipeline</h3>

        <div class="param">
          <div class="param-header"><label>Records per Query</label><input type="number" class="number-input" v-model.number="records" min="1" max="100000" /></div>
          <input type="range" v-model.number="records" min="100" max="10000" step="100" />
          <div class="param-range"><span>100</span><span>10,000</span></div>
        </div>

        <div class="param">
          <div class="param-header"><label>Queries per Day</label><input type="number" class="number-input" v-model.number="queriesPerDay" min="1" max="10000000" /></div>
          <input type="range" v-model.number="queriesPerDay" min="10" max="1000000" step="10" />
          <div class="param-range"><span>10</span><span>1,000,000</span></div>
        </div>

        <div class="param">
          <div class="param-header"><label>Model</label></div>
          <select v-model.number="selectedModel" class="model-select" @change="useCustom = false">
            <option v-for="(m, i) in models" :key="i" :value="i">{{ m.name }} ({{ m.provider }}) — ${{ m.input }}/MTok</option>
          </select>
        </div>

        <div class="param">
          <div class="param-header"><label>Custom $/MTok <input type="checkbox" v-model="useCustom" /></label><input type="number" class="number-input" v-model.number="customCost" min="0.01" max="100" step="0.01" :disabled="!useCustom" :style="{ opacity: useCustom ? 1 : 0.4 }" /></div>
          <input type="range" v-model.number="customCost" min="0.1" max="50" step="0.1" :disabled="!useCustom" />
        </div>

        <div class="param">
          <div class="param-header"><label>Session Call # (GCF dedup)</label><span class="value">Call {{ sessionCalls }}{{ sessionCalls >= 5 ? '+' : '' }}</span></div>
          <input type="range" v-model.number="sessionCalls" min="1" max="5" step="1" />
          <div class="param-range"><span>1 (first call)</span><span>5+ (warm session)</span></div>
        </div>
      </div>

      <div class="right">
        <!-- What you're paying now -->
        <div class="current-cost">
          <div class="current-label">YOUR CURRENT MONTHLY COST</div>
          <div class="current-amount">{{ formatCurrency(monthlyCost.json) }}</div>
          <div class="current-sub">per month with JSON</div>
        </div>

        <!-- Visual cost comparison bars -->
        <div class="cost-bars">
          <div class="bar-row">
            <div class="bar-label">JSON</div>
            <div class="bar-track">
              <div class="bar-fill json" :style="{ width: barWidth.json + '%' }">
                <span class="bar-amount">{{ formatCurrency(monthlyCost.json) }}</span>
              </div>
            </div>
          </div>
          <div class="bar-row">
            <div class="bar-label">TOON</div>
            <div class="bar-track">
              <div class="bar-fill toon" :style="{ width: barWidth.toon + '%' }">
                <span class="bar-amount">{{ formatCurrency(monthlyCost.toon) }}</span>
              </div>
            </div>
          </div>
          <div class="bar-row">
            <div class="bar-label">GCF</div>
            <div class="bar-track">
              <div class="bar-fill gcf" :style="{ width: barWidth.gcf + '%' }">
                <span class="bar-amount">{{ formatCurrency(monthlyCost.gcf) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Annual savings hero -->
        <div class="savings-hero">
          <div class="savings-hero-amount">{{ formatCurrency(annualSavings.vsJson) }}</div>
          <div class="savings-hero-label">saved per year vs JSON</div>
          <div class="savings-pills">
            <span class="pill green">{{ pctSaved.vsJson }}% savings vs JSON</span>
            <span class="pill blue">{{ pctSaved.vsToon }}% savings vs TOON</span>
          </div>
        </div>

        <!-- Token details toggle -->
        <div class="token-toggle" @click="showTokens = !showTokens">
          <span>{{ showTokens ? '▾' : '▸' }} Token details</span>
        </div>
        <div v-if="showTokens" class="token-details">
          <div class="token-line"><span>Tokens/query (GCF):</span><strong>{{ tokensPerQuery.gcf.toLocaleString() }}</strong></div>
          <div class="token-line"><span>Tokens/query (TOON):</span><strong>{{ tokensPerQuery.toon.toLocaleString() }}</strong></div>
          <div class="token-line"><span>Tokens/query (JSON):</span><strong>{{ tokensPerQuery.json.toLocaleString() }}</strong></div>
          <div class="token-line"><span>Monthly tokens (GCF):</span><strong>{{ monthlyTokens.gcf }}M</strong></div>
          <div class="token-line"><span>Monthly tokens (TOON):</span><strong>{{ monthlyTokens.toon }}M</strong></div>
          <div class="token-line"><span>Monthly tokens (JSON):</span><strong>{{ monthlyTokens.json }}M</strong></div>
        </div>
      </div>
    </div>

    <div class="note">
      <p><strong>Data source:</strong> Token counts measured from actual 500/1000-order nested payloads using o200k_base tokenizer. GCF session dedup compounds savings across multi-turn agent sessions. TOON and JSON retransmit everything on every call.</p>
    </div>
  </div>
</template>

<style scoped>
.calculator {
  max-width: 1000px;
  margin: 2rem auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.hero-title {
  font-size: 2.4rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 0.75rem;
}

.subtitle {
  color: var(--vp-c-text-2);
  text-align: center;
  margin-bottom: 3rem;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.left, .right {
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.left h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.param { margin-bottom: 1.25rem; }

.param-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.param label { font-weight: 600; font-size: 0.9rem; }
.param .value { font-weight: 700; font-size: 0.95rem; }

.number-input {
  width: 110px;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: right;
  color: var(--vp-c-text-1);
  -moz-appearance: textfield;
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button { opacity: 1; }

.number-input:focus { outline: none; border-color: #2563eb; }

.param input[type="range"] { width: 100%; accent-color: #2563eb; }

.param-range {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 0.2rem;
}

.model-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 2px solid #2563eb;
  background: rgba(37, 99, 235, 0.05);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* Right panel: Current cost */
.current-cost {
  text-align: center;
  margin-bottom: 1.75rem;
}

.current-cost {
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
}

.current-label {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ef4444;
  margin-bottom: 0.5rem;
}

.current-amount {
  font-size: 3rem;
  font-weight: 800;
  color: #ef4444;
  line-height: 1;
}

.current-sub {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-top: 0.4rem;
}

/* Cost comparison bars */
.cost-bars {
  margin-bottom: 1.75rem;
}

.bar-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.6rem;
}

.bar-label {
  width: 50px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 32px;
  background: var(--vp-c-bg);
  border-radius: 6px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  transition: width 0.4s ease;
  min-width: 80px;
}

.bar-fill.json { background: rgba(107, 114, 128, 0.3); }
.bar-fill.toon { background: rgba(245, 158, 11, 0.25); }
.bar-fill.gcf { background: rgba(37, 99, 235, 0.25); }

.bar-amount {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

/* Savings hero */
.savings-hero {
  text-align: center;
  padding: 1.25rem;
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 10px;
  margin-bottom: 1rem;
}

.savings-hero-amount {
  font-size: 2.6rem;
  font-weight: 800;
  color: #22c55e;
  line-height: 1;
}

.savings-hero-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-top: 0.4rem;
  margin-bottom: 0.75rem;
}

.savings-pills {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.pill {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
}

.pill.green {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.pill.blue {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.12);
}

/* Token details toggle */
.token-toggle {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 0.5rem 0;
  user-select: none;
}

.token-toggle:hover { color: var(--vp-c-text-2); }

.token-details {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  margin-top: 0.25rem;
}

.token-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.2rem 0;
  font-family: "SF Mono", "Fira Code", monospace;
  color: var(--vp-c-text-2);
}

.note {
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.note p { margin: 0.5rem 0; }

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .current-amount { font-size: 2.2rem; }
  .savings-hero-amount { font-size: 2rem; }
}
</style>
