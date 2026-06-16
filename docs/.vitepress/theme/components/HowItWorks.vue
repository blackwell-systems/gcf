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
  <div class="how-it-works-section">
  <section class="how-it-works">
    <div class="container">
      <h2 class="section-title">Two Profiles. One Format.</h2>
      <p class="section-subtitle">The generic profile is a strict subset of the graph profile. Call <code>encode()</code>, the LLM reads it natively, call <code>decode()</code> at the end.</p>
      <p class="section-graph-note"><strong>Graph-shaped data is the fastest-growing data shape in AI:</strong> knowledge systems, ontologies, GraphRAG, code intelligence, agent memory. No other token-efficient format treats graphs as first-class. GCF is the only format with native graph syntax: local IDs, typed edges, distance grouping, and session deduplication that compounds to 92% savings across multi-turn sessions.</p>

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
        <p class="section-subtitle">Seven building blocks. No ambiguity.</p>

        <div class="grammar-columns">
          <div class="grammar-column">
            <div class="grammar-column-header">Generic Profile</div>

            <div class="grammar-entry">
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

            <div class="grammar-entry">
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

            <div class="grammar-entry">
              <h4>Scalars &amp; Key-Value</h4>
              <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF('name=Alice\nage=30\nactive=true\nmissing=-\nempty=&quot;&quot;')"></code><code v-else>name=Alice
age=30
active=true
missing=-
empty=""</code></pre>
              <ul class="grammar-notes">
                <li><code>key=value</code> for primitives</li>
                <li><code>-</code> null, <code>~</code> absent, <code>""</code> empty string</li>
                <li>Quote if value contains <code>|</code> or newline</li>
              </ul>
            </div>

            <div class="grammar-entry">
              <h4>Nested Objects</h4>
              <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## orders [2]{id,total,customer}\n@0 1001|249.99|^{name,tier}\nAlice|premium\n@1 1002|89.50|^\nBob|standard`)"></code><code v-else>## orders [2]{id,total,customer}
@0 1001|249.99|^{name,tier}
Alice|premium
@1 1002|89.50|^
Bob|standard</code></pre>
              <ul class="grammar-notes">
                <li><code>^{fields}</code> attachment with inline schema</li>
                <li>Subsequent rows use bare <code>^</code></li>
                <li>Nested values follow on next line</li>
              </ul>
            </div>
          </div>

          <div class="grammar-column">
            <div class="grammar-column-header">Graph Profile</div>

            <div class="grammar-entry">
              <h4>Symbols</h4>
              <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`@1 func handleReq 0.95\n@2 iface AuthCfg 0.60 ast\n@3\n@4 func revoke 0.91`)"></code><code v-else>@1 func handleReq 0.95
@2 iface AuthCfg 0.60 ast
@3
@4 func revoke 0.91</code></pre>
              <ul class="grammar-notes">
                <li><code>@N</code> local ID, <code>kind</code>, <code>qname</code>, <code>score</code>, <code>provenance</code></li>
                <li>Bare <code>@N</code> = session ref (already transmitted)</li>
              </ul>
            </div>

            <div class="grammar-entry">
              <h4>Edges</h4>
              <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`@2<@1 calls\n@3<@1 calls\n@4<@2 implements`)"></code><code v-else>@2<@1 calls
@3<@1 calls
@4<@2 implements</code></pre>
              <ul class="grammar-notes">
                <li><code>@target&lt;@source type</code></li>
                <li>One edge per line, no nesting overhead</li>
              </ul>
            </div>

            <div class="grammar-entry">
              <h4>Distance Groups</h4>
              <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## targets [3]\n@0 fn handleReq 0.95 lsp\n@1 fn validate 0.87 lsp\n@2 fn connect 0.91 lsp\n\n## related [2]\n@3 fn helper 0.60 ast\n@4 iface Config 0.55 ast`)"></code><code v-else>## targets [3]
@0 fn handleReq 0.95 lsp
@1 fn validate 0.87 lsp
@2 fn connect 0.91 lsp

## related [2]
@3 fn helper 0.60 ast
@4 iface Config 0.55 ast</code></pre>
              <ul class="grammar-notes">
                <li><code>targets</code>, <code>related</code>, <code>extended</code> by relevance</li>
                <li>LLM reads count from header, no scanning</li>
              </ul>
            </div>

            <div class="grammar-entry">
              <h4>Streaming <span class="both-badge">both profiles</span></h4>
              <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## results [?]{name,kind}\nvalidate|func\nconnect|func\nhandle|func\n##! summary counts=3`)"></code><code v-else>## results [?]{name,kind}
validate|func
connect|func
handle|func
##! summary counts=3</code></pre>
              <ul class="grammar-notes">
                <li><code>[?]</code> count unknown upfront</li>
                <li>Rows emit instantly, O(1) memory</li>
                <li><code>##!</code> trailer finalizes count</li>
                <li>Zero buffering, zero latency</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  </div>
</template>

<style scoped>
.how-it-works-section {
  background: rgba(17, 51, 72, 0.25);
  border-top: 1px solid rgba(24, 190, 252, 0.06);
  border-bottom: 1px solid rgba(24, 190, 252, 0.06);
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

.grammar {
  margin-top: 4rem;
}

.grammar-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.grammar-column {
  background: rgba(24, 190, 252, 0.03);
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 14px;
  padding: 1.5rem;
}

.grammar-column-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gcf-blue, #18befc);
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(24, 190, 252, 0.1);
}

.grammar-entry {
  margin-bottom: 1.5rem;
}

.grammar-entry:last-child {
  margin-bottom: 0;
}

.grammar-entry h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.6rem;
}

.grammar-code {
  background: #000;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  font-size: 0.72rem;
  line-height: 1.6;
  margin: 0 0 0.75rem 0;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.both-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  .grammar-columns {
    grid-template-columns: 1fr;
  }
}
</style>
