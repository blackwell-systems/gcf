<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initParser, highlightGCF, highlightJSON } from '../gcf-highlight'

const ready = ref(false)

const examples = [
  {
    title: 'Generic Profile',
    subtitle: 'Any structured data (subset)',
    description: 'Any structured value in, same value out. Verified lossless across 33 billion+ round-trips with JSON, YAML, TOML, CSV, and MessagePack. 71% fewer tokens than JSON.',
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
    title: 'Graph Profile',
    subtitle: 'Superset: adds IDs, edges, scores',
    description: 'Knowledge graphs, code intelligence, ontologies, relationship networks. Graph-shaped data is the fastest-growing data shape in AI. No other format treats it as a first-class citizen.',
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
    subtitle: 'Graph profile',
    description: 'JSON retransmits everything on every call. GCF tracks which symbols have been sent and only transmits bare references for known ones. 92% savings by the 5th call.',
    jsonLabel: 'JSON (call 2: full retransmit)',
    gcfLabel: 'GCF (call 2: bare refs + new)',
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
  <div class="hiw-band">
  <section class="how-it-works">
    <div class="container">
      <h2 class="section-title">Two Profiles. One Format.</h2>
      <p class="section-subtitle">The generic profile is a strict subset of the graph profile. Call <code>encode()</code>, the LLM reads it natively, call <code>decode()</code> at the end.</p>
      <p class="section-graph-note"><strong>Graph-shaped data is the fastest-growing data shape in AI:</strong> knowledge systems, ontologies, GraphRAG, code intelligence, agent memory. No other token-efficient format treats graphs as first-class. GCF is the only format with native graph syntax: local IDs, typed edges, distance grouping, and session deduplication that compounds to 92% savings across multi-turn sessions.</p>

      <div class="cards">
        <div v-for="(ex, i) in examples" :key="i" class="card gcf-corners">
          <div class="card-number">{{ i + 1 }}</div>
          <h3 class="card-title">{{ ex.title }}</h3>
          <div v-if="ex.subtitle" class="card-subtitle">{{ ex.subtitle }}</div>
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
  </div>
</template>

<style scoped>
.hiw-band {
  background: #020204;
  padding: 8px 0;
  width: 100vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

.how-it-works {
  padding: 4rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
}

.section-subtitle {
  text-align: center;
  color: var(--vp-c-text-2);
  margin-bottom: 1rem;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

.section-graph-note {
  text-align: justify;
  color: var(--gcf-blue, #18befc);
  font-size: 0.9rem;
  line-height: 1.7;
  max-width: 720px;
  margin: 0 auto 3rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  background: rgba(24, 190, 252, 0.03);
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 14px;
  padding: 1.5rem;
  position: relative;
}

.card-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gcf-blue, #18befc);
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

.card-subtitle {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gcf-blue, #18befc);
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
  background: #000;
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
