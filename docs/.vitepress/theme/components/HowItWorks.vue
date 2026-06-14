<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initParser, highlightGCF, highlightJSON } from '../gcf-highlight'

const ready = ref(false)

const examples = [
  {
    title: 'Inline Schemas',
    description: 'JSON repeats every key on every row. GCF declares them once. At 500 rows, that\'s thousands of wasted tokens.',
    json: `[
  {"name":"validateToken",
   "kind":"func","refs":18},
  {"name":"refreshSession",
   "kind":"func","refs":6},
  {"name":"getConnection",
   "kind":"func","refs":34},
  {"name":"runMigration",
   "kind":"func","refs":3}
]`,
    gcf: `## results [4]{name,kind,refs}
validateToken|func|18
refreshSession|func|6
getConnection|func|34
runMigration|func|3`,
  },
  {
    title: 'Graph Structure',
    description: 'Symbols and relationships. GCF encodes both in a format LLMs parse natively.',
    json: `{
  "symbols": [
    {"id":1,"kind":"func",
     "name":"handleReq"},
    {"id":2,"kind":"func",
     "name":"validate"},
    {"id":3,"kind":"iface",
     "name":"AuthCfg"}
  ],
  "edges": [
    {"src":1,"tgt":2,
     "type":"calls"},
    {"src":2,"tgt":3,
     "type":"implements"}
  ]
}`,
    gcf: `## symbols [3]
@1 func handleReq 0.95
@2 func validate 0.87
@3 iface AuthCfg 0.60

## edges [2]
@2<@1 calls
@3<@2 implements`,
  },
  {
    title: 'Session Dedup',
    description: 'Call 2: JSON retransmits everything. GCF sends only what changed.',
    jsonLabel: 'JSON (call 2)',
    gcfLabel: 'GCF (call 2)',
    json: `[
  {"id":1,"kind":"func",
   "name":"handleReq"},
  {"id":2,"kind":"func",
   "name":"validate"},
  {"id":3,"kind":"iface",
   "name":"AuthCfg"},
  {"id":4,"kind":"func",
   "name":"revoke"}
]`,
    gcf: `## symbols [4]
@1
@2
@3
@4 func revoke 0.91`,
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
