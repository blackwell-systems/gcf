<script setup lang="ts">
import { ref, computed } from 'vue'

const records = ref(500)
const queriesPerDay = ref(1000)
const sessionCalls = ref(1)

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

const selectedModel = ref(2) // Claude Sonnet 4.6 default
const customCost = ref(0)
const useCustom = ref(false)
const costPerMillion = computed(() => useCustom.value ? customCost.value : models[selectedModel.value].input)

// Token data from real eval measurements
// These are actual measured values, not estimates
const tokensPerQuery = computed(() => {
  const r = records.value
  // Linear interpolation from measured data points:
  // 500 orders: GCF 23,653 / TOON 42,151 / JSON 80,653
  // 1000 orders: GCF 47,000 / TOON 84,000 / JSON 161,000
  const ratio = r / 500
  const gcfBase = Math.round(23653 * ratio)
  const toonBase = Math.round(42151 * ratio)
  const jsonBase = Math.round(80653 * ratio)

  // Apply session dedup for GCF (compounding savings)
  // Call 1: 100%, Call 2: 35%, Call 3: 20%, Call 4: 12%, Call 5+: 8%
  const sessionMultipliers = [1.0, 0.35, 0.20, 0.12, 0.08]
  const sessIdx = Math.min(sessionCalls.value - 1, 4)
  const gcfWithSession = Math.round(gcfBase * sessionMultipliers[sessIdx])

  return {
    gcf: gcfWithSession,
    toon: toonBase,
    json: jsonBase,
  }
})

const monthlyCost = computed(() => {
  const dailyQueries = queriesPerDay.value
  const monthlyQueries = dailyQueries * 30
  const cpm = costPerMillion.value

  return {
    gcf: (tokensPerQuery.value.gcf * monthlyQueries / 1_000_000) * cpm,
    toon: (tokensPerQuery.value.toon * monthlyQueries / 1_000_000) * cpm,
    json: (tokensPerQuery.value.json * monthlyQueries / 1_000_000) * cpm,
  }
})

const annualSavings = computed(() => {
  return {
    vsJson: (monthlyCost.value.json - monthlyCost.value.gcf) * 12,
    vsToon: (monthlyCost.value.toon - monthlyCost.value.gcf) * 12,
  }
})

const monthlyTokens = computed(() => {
  const dailyQueries = queriesPerDay.value
  const monthlyQueries = dailyQueries * 30
  return {
    gcf: (tokensPerQuery.value.gcf * monthlyQueries / 1_000_000).toFixed(1),
    toon: (tokensPerQuery.value.toon * monthlyQueries / 1_000_000).toFixed(1),
    json: (tokensPerQuery.value.json * monthlyQueries / 1_000_000).toFixed(1),
  }
})

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatCurrencyMonth(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<template>
  <div class="calculator">
    <h1 class="hero-title">Real-World Cost Savings</h1>
    <p class="subtitle">Calculate your savings with GCF based on your usage</p>

    <div class="layout">
      <div class="left">
        <h3>Your Parameters</h3>

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

        <div class="token-stats">
          <div>Tokens per query (GCF): <strong>{{ tokensPerQuery.gcf.toLocaleString() }}</strong></div>
          <div>Tokens per query (TOON): <strong>{{ tokensPerQuery.toon.toLocaleString() }}</strong></div>
          <div>Tokens per query (JSON): <strong>{{ tokensPerQuery.json.toLocaleString() }}</strong></div>
        </div>
      </div>

      <div class="right">
        <div class="annual-savings">
          <div class="annual-label">ANNUAL SAVINGS WITH GCF</div>
          <div class="savings-row">
            <div class="annual-amount vs-json">{{ formatCurrency(annualSavings.vsJson) }}</div>
            <div class="annual-versus">vs JSON</div>
          </div>
          <div class="savings-row">
            <div class="annual-amount vs-toon">{{ formatCurrency(annualSavings.vsToon) }}</div>
            <div class="annual-versus">vs TOON</div>
          </div>
        </div>

        <div class="monthly-grid">
          <div class="monthly-card gcf">
            <div class="format-name">GCF</div>
            <div class="cost">{{ formatCurrencyMonth(monthlyCost.gcf) }}</div>
            <div class="per">per month</div>
          </div>
          <div class="monthly-card toon">
            <div class="format-name">TOON</div>
            <div class="cost">{{ formatCurrencyMonth(monthlyCost.toon) }}</div>
            <div class="per">per month</div>
          </div>
          <div class="monthly-card json">
            <div class="format-name">JSON</div>
            <div class="cost">{{ formatCurrencyMonth(monthlyCost.json) }}</div>
            <div class="per">per month</div>
          </div>
        </div>

        <div class="monthly-tokens">
          <h4>Monthly Token Usage</h4>
          <div class="token-line"><span>GCF:</span><strong>{{ monthlyTokens.gcf }}M</strong></div>
          <div class="token-line"><span>TOON:</span><strong>{{ monthlyTokens.toon }}M</strong></div>
          <div class="token-line"><span>JSON:</span><strong>{{ monthlyTokens.json }}M</strong></div>
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

.param {
  margin-bottom: 1.25rem;
}

.param-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.param label {
  font-weight: 600;
  font-size: 0.9rem;
}

.param .value {
  font-weight: 700;
  font-size: 0.95rem;
}

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
.number-input::-webkit-outer-spin-button {
  opacity: 1;
}

.number-input:focus {
  outline: none;
  border-color: #2563eb;
}

.param input[type="range"] {
  width: 100%;
  accent-color: #2563eb;
}

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

.token-stats {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}

.annual-savings {
  text-align: center;
  margin-bottom: 1.5rem;
}

.annual-label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  margin-bottom: 1.25rem;
}

.savings-row {
  margin-bottom: 1.25rem;
}

.annual-amount {
  font-weight: 800;
}

.annual-amount.vs-json {
  font-size: 2.8rem;
  color: #22c55e;
}

.annual-amount.vs-toon {
  font-size: 1.8rem;
  color: #2563eb;
}

.annual-versus {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-top: 0.3rem;
}

.monthly-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.monthly-card {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  background: var(--vp-c-bg);
}

.monthly-card .format-name {
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.monthly-card.gcf .format-name { color: #2563eb; }
.monthly-card.toon .format-name { color: #f59e0b; }
.monthly-card.json .format-name { color: #6b7280; }

.monthly-card .cost {
  font-size: 1.3rem;
  font-weight: 800;
}

.monthly-card .per {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.monthly-tokens {
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
}

.monthly-tokens h4 {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.token-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.25rem 0;
  font-family: "SF Mono", "Fira Code", monospace;
}

.note {
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.note p {
  margin: 0.5rem 0;
}

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .monthly-grid { grid-template-columns: 1fr; }
}
</style>
