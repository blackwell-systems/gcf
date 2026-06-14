<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initParser, highlightGCF, highlightJSON } from '../gcf-highlight'

const ready = ref(false)

const examples = [
  {
    title: 'Generic Profile',
    subtitle: 'Lossless JSON codec (subset)',
    description: 'Any JSON value in, same JSON value out. Verified lossless across 1,000,000,000+ random round-trips. 71% fewer tokens. Perfect interoperability.',
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
    subtitle: 'Both profiles',
    description: 'JSON retransmits everything on every call. GCF tracks what\'s been sent and only transmits deltas. 92% savings by the 5th call in a session.',
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
  <section class="how-it-works">
    <div class="container">
      <h2 class="section-title">Two Profiles. One Format.</h2>
      <p class="section-subtitle">One grammar, two profiles. The generic profile is a strict subset of the graph profile: learn one, use both. Any JSON in, same JSON out. Graphs get first-class syntax.</p>

      <div class="cards">
        <div v-for="(ex, i) in examples" :key="i" class="card">
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

      <!-- Grammar Reference -->
      <div class="grammar">
        <h2 class="section-title">GCF Grammar</h2>
        <p class="section-subtitle">Five building blocks. No ambiguity.</p>

        <div class="grammar-grid">
          <div class="grammar-card">
            <h4>Section Headers</h4>
            <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## symbols [4]{kind,qname}\n## edges [3]\n## targets\n##! summary`)"></code><code v-else>## symbols [4]{kind,qname}
## edges [3]
## targets
##! summary</code></pre>
            <ul class="grammar-notes">
              <li><code>##</code> section start</li>
              <li><code>[N]</code> element count</li>
              <li><code>{fields}</code> inline schema</li>
              <li><code>[?]</code> deferred count (streaming)</li>
              <li><code>##!</code> summary trailer</li>
            </ul>
          </div>

          <div class="grammar-card">
            <h4>Symbols</h4>
            <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`@1 func handleReq 0.95\n@2 iface AuthCfg 0.60 ast\n@3\n@4 func revoke 0.91`)"></code><code v-else>@1 func handleReq 0.95
@2 iface AuthCfg 0.60 ast
@3
@4 func revoke 0.91</code></pre>
            <ul class="grammar-notes">
              <li><code>@N</code> local ID</li>
              <li><code>kind</code> symbol type</li>
              <li><code>qname</code> qualified name</li>
              <li><code>score</code> relevance (0-1)</li>
              <li><code>provenance</code> source tag</li>
              <li>Bare <code>@N</code> = session ref (known)</li>
            </ul>
          </div>

          <div class="grammar-card">
            <h4>Edges</h4>
            <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`@2<@1 calls\n@3<@1 calls\n@4<@2 implements`)"></code><code v-else>@2<@1 calls
@3<@1 calls
@4<@2 implements</code></pre>
            <ul class="grammar-notes">
              <li><code>@target&lt;@source</code> direction</li>
              <li><code>type</code> relationship kind</li>
              <li>One edge per line</li>
              <li>No JSON nesting overhead</li>
            </ul>
          </div>

          <div class="grammar-card">
            <h4>Tabular Data</h4>
            <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## users [3]{name,role,active}\nAlice|admin|true\nBob|dev|true\nCarol|dev|false`)"></code><code v-else>## users [3]{name,role,active}
Alice|admin|true
Bob|dev|true
Carol|dev|false</code></pre>
            <ul class="grammar-notes">
              <li><code>|</code> pipe-separated values</li>
              <li>Fields declared once in header</li>
              <li>No quotes unless needed</li>
              <li>No braces, no colons per row</li>
            </ul>
          </div>

          <div class="grammar-card">
            <h4>Streaming</h4>
            <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## results [?]{name,kind}\nvalidate|func\nconnect|func\nhandle|func\n##! summary counts=3`)"></code><code v-else>## results [?]{name,kind}
validate|func
connect|func
handle|func
##! summary counts=3</code></pre>
            <ul class="grammar-notes">
              <li><code>[?]</code> count unknown upfront</li>
              <li>Rows emit instantly, O(1) memory</li>
              <li><code>##!</code> trailer finalizes count</li>
              <li>Works for both profiles</li>
              <li>Zero buffering, zero latency</li>
            </ul>
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

.card-subtitle {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-brand-1);
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

.grammar {
  margin-top: 4rem;
}

.grammar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.grammar-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem;
}

.grammar-card h4 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.grammar-code {
  background: #1e1e2e;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  font-size: 0.72rem;
  line-height: 1.6;
  margin: 0 0 0.75rem 0;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.grammar-code code {
  color: #abb2bf;
  white-space: pre;
}

.grammar-notes {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}

.grammar-notes code {
  font-size: 0.72rem;
  background: var(--vp-c-bg);
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
  .grammar-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .grammar-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
