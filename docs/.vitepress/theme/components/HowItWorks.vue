<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initParser, highlightGCF, highlightJSON } from '../gcf-highlight'

const ready = ref(false)

const examples = [
  {
    title: 'Inline Schemas',
    description: 'Field names declared once in the header. Body rows are positional values. No repeated keys.',
    json: `[
  {"name":"Alice","age":32,"city":"NYC"},
  {"name":"Bob","age":28,"city":"LA"},
  {"name":"Carol","age":45,"city":"NYC"}
]`,
    gcf: `## employees [3]{name,age,city}
Alice|32|NYC
Bob|28|LA
Carol|45|NYC`,
  },
  {
    title: 'Section Headers',
    description: 'Sections separate data groups. Count in header. No array syntax overhead.',
    json: `{
  "symbols": [
    {"id":"@1","kind":"func","name":"main"},
    {"id":"@2","kind":"func","name":"init"}
  ],
  "edges": [
    {"source":"@1","target":"@2","type":"calls"}
  ]
}`,
    gcf: `## symbols [2]{kind,qname}
@1 func main
@2 func init

## edges [1]
@2<@1 calls`,
  },
  {
    title: 'Session Dedup',
    description: 'Previously transmitted symbols become bare references. 92% savings by the 5th call.',
    json: `// Call 2: retransmit everything
[
  {"id":"@1","kind":"func","name":"main"...},
  {"id":"@2","kind":"func","name":"init"...},
  {"id":"@3","kind":"func","name":"new_func"...}
]`,
    gcf: `## symbols [3]
@1
@2
@3 func new_func 0.95`,
  },
]

onMounted(async () => {
  await initParser()
  ready.value = true
})
</script>

<template>
  <section class="how-it-works">
    <div class="container">
      <h2 class="section-title">How GCF Works</h2>
      <p class="section-subtitle">Three concepts. Same data. Fewer tokens.</p>

      <div class="cards">
        <div v-for="(ex, i) in examples" :key="i" class="card">
          <div class="card-number">{{ i + 1 }}</div>
          <h3 class="card-title">{{ ex.title }}</h3>
          <p class="card-desc">{{ ex.description }}</p>

          <div class="comparison">
            <div class="format-block json-block">
              <div class="format-label">JSON</div>
              <pre class="code-block"><code v-if="ready" v-html="highlightJSON(ex.json)"></code><code v-else>{{ ex.json }}</code></pre>
            </div>
            <div class="format-block gcf-block">
              <div class="format-label gcf-label">GCF</div>
              <pre class="code-block"><code v-if="ready" v-html="highlightGCF(ex.gcf)"></code><code v-else>{{ ex.gcf }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.how-it-works {
  padding: 4rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 0.5rem;
}

.section-subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin-bottom: 3rem;
  font-size: 1.1rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
}

.card-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.comparison {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.format-block {
  border-radius: 8px;
  overflow: hidden;
}

.format-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.6rem;
  color: #6b7280;
  background: rgba(107, 114, 128, 0.1);
}

.format-label.gcf-label {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}

.code-block {
  background: #1e1e2e;
  padding: 0.6rem 0.75rem;
  font-size: 0.72rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.code-block code {
  color: #abb2bf;
  white-space: pre;
}

@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
