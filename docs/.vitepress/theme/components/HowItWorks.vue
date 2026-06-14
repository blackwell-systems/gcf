<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initParser, highlightGCF, highlightJSON } from '../gcf-highlight'

const ready = ref(false)

const examples = [
  {
    title: 'Inline Schemas',
    description: 'JSON repeats every key on every row. GCF declares them once. At 500 rows, that\'s thousands of wasted tokens.',
    json: `[
  {"file":"src/auth.ts","line":42,"symbol":"validateToken","kind":"function","refs":18},
  {"file":"src/auth.ts","line":87,"symbol":"refreshSession","kind":"function","refs":6},
  {"file":"src/db.ts","line":12,"symbol":"getConnection","kind":"function","refs":34},
  {"file":"src/db.ts","line":55,"symbol":"runMigration","kind":"function","refs":3},
  {"file":"src/api.ts","line":8,"symbol":"handleRequest","kind":"function","refs":27}
]`,
    gcf: `## results [5]{file,line,symbol,kind,refs}
src/auth.ts|42|validateToken|function|18
src/auth.ts|87|refreshSession|function|6
src/db.ts|12|getConnection|function|34
src/db.ts|55|runMigration|function|3
src/api.ts|8|handleRequest|function|27`,
  },
  {
    title: 'Graph Structure',
    description: 'Code intelligence returns symbols and their relationships. GCF encodes both in a format LLMs parse natively.',
    json: `{
  "symbols": [
    {"id":1,"kind":"function","name":"handleRequest","score":0.95},
    {"id":2,"kind":"function","name":"validateToken","score":0.87},
    {"id":3,"kind":"function","name":"getConnection","score":0.82},
    {"id":4,"kind":"interface","name":"AuthConfig","score":0.60}
  ],
  "edges": [
    {"source":1,"target":2,"type":"calls"},
    {"source":1,"target":3,"type":"calls"},
    {"source":2,"target":4,"type":"implements"}
  ]
}`,
    gcf: `## symbols [4]
@1 function handleRequest 0.95
@2 function validateToken 0.87
@3 function getConnection 0.82
@4 interface AuthConfig 0.60

## edges [3]
@2<@1 calls
@3<@1 calls
@4<@2 implements`,
  },
  {
    title: 'Session Dedup',
    description: 'Call 1 sends everything. Call 2 only sends what changed. JSON retransmits the full payload every time.',
    jsonLabel: 'JSON (call 2: full retransmit)',
    gcfLabel: 'GCF (call 2: bare refs + delta)',
    json: `[
  {"id":1,"kind":"function","name":"handleRequest","score":0.95},
  {"id":2,"kind":"function","name":"validateToken","score":0.87},
  {"id":3,"kind":"function","name":"getConnection","score":0.82},
  {"id":4,"kind":"interface","name":"AuthConfig","score":0.60},
  {"id":5,"kind":"function","name":"revokeToken","score":0.91}
]`,
    gcf: `## symbols [5]
@1
@2
@3
@4
@5 function revokeToken 0.91`,
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
              <div class="format-label">{{ ex.jsonLabel || 'JSON' }}</div>
              <pre class="code-block"><code v-if="ready" v-html="highlightJSON(ex.json)"></code><code v-else>{{ ex.json }}</code></pre>
            </div>
            <div class="format-block gcf-block">
              <div class="format-label gcf-label">{{ ex.gcfLabel || 'GCF' }}</div>
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
