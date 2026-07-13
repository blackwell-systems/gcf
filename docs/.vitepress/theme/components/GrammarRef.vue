<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { initParser, highlightGCF } from '../gcf-highlight'

const ready = ref(false)

onMounted(async () => {
  await initParser()
  ready.value = true
})
</script>

<template>
  <section class="grammar-section">
    <h2 class="section-title">GCF Grammar</h2>
    <p class="section-subtitle">Two profiles. Session-aware. No ambiguity.</p>

    <div class="grammar-columns">
      <div class="grammar-column gcf-corners">
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
          <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`## orders [2]{id,total,&quot;customer>name&quot;,&quot;customer>tier&quot;}\n1001|249.99|Alice|premium\n1002|89.50|Bob|standard`)"></code><code v-else>## orders [2]{id,total,"customer>name","customer>tier"}
1001|249.99|Alice|premium
1002|89.50|Bob|standard</code></pre>
          <ul class="grammar-notes">
            <li><code>"customer>name"</code> flattens nested field into column</li>
            <li><code>></code> separates path levels</li>
            <li>Values go directly in the row (no attachments)</li>
          </ul>
        </div>
      </div>

      <div class="grammar-column gcf-corners">
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
          <h4>Session Dedup <span class="both-badge">graph profile</span></h4>
          <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`GCF profile=graph tool=blast_radius symbols=6 session=true\n## targets\n@0  # previously transmitted\n@1  # previously transmitted\n@5 fn pkg.NewFunc 0.85 lsp`)"></code><code v-else>GCF profile=graph tool=blast_radius symbols=6 session=true
## targets
@0  # previously transmitted
@1  # previously transmitted
@5 fn pkg.NewFunc 0.85 lsp</code></pre>
          <ul class="grammar-notes">
            <li><code>session=true</code> signals bare refs present</li>
            <li><code>@N  # previously transmitted</code> = sent in prior call</li>
            <li>LLM already has the full declaration in context</li>
            <li>88% savings vs JSON across multi-turn sessions</li>
          </ul>
        </div>

        <div class="grammar-entry">
          <h4>Delta Encoding <span class="both-badge">graph profile</span></h4>
          <pre class="grammar-code"><code v-if="ready" v-html="highlightGCF(`GCF tool=topology delta=true tokens=30 savings=85%\n## removed\nfn pkg.OldHandler\n## added\n@0 fn pkg.NewHandler 0.85 lsp 0\n## edges_added\npkg.Router -> pkg.NewHandler calls`)"></code><code v-else>GCF tool=topology delta=true tokens=30 savings=85%
## removed
fn pkg.OldHandler
## added
@0 fn pkg.NewHandler 0.85 lsp 0
## edges_added
pkg.Router -> pkg.NewHandler calls</code></pre>
          <ul class="grammar-notes">
            <li><code>delta=true</code> signals diff from prior payload</li>
            <li>Only added/removed symbols and edges</li>
            <li>95% savings for small topology changes</li>
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
  </section>
</template>

<style scoped>
.grammar-section {
  padding: 3rem 1.5rem;
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
  margin-bottom: 2rem;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
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
  position: relative;
  z-index: 2;
}

.grammar-code code {
  color: #abb2bf;
  white-space: pre;
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
  .grammar-columns {
    grid-template-columns: 1fr;
  }
}
</style>
