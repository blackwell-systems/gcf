<template>
  <div class="ba-section">
    <div class="ba-inner">
      <h2 class="ba-title">See the Difference</h2>
      <p class="ba-subtitle">Same data. Fewer tokens. Zero information loss.</p>

      <div class="ba-grid">
        <div class="ba-card json-card">
          <div class="ba-header">
            <span class="ba-label">JSON</span>
            <span class="ba-badge json-badge">458 tokens</span>
          </div>
          <pre class="ba-code"><code>{
  "orders": [
    {"id": 1001, "customer": "Acme Corp",
     "total": 49.99, "status": "shipped",
     "items": 1},
    {"id": 1002, "customer": "Globex Inc",
     "total": 150.49, "status": "pending",
     "items": 2},
    {"id": 1003, "customer": "Initech LLC",
     "total": 250.99, "status": "processing",
     "items": 3},
    <span class="ba-fade">{"id": 1004, ...},
    {"id": 1005, ...},
    {"id": 1006, ...},
    {"id": 1007, ...},
    {"id": 1008, ...},
    {"id": 1009, ...},
    {"id": 1010, ...}</span>
  ]
}</code></pre>
        </div>

        <div class="ba-card gcf-card">
          <div class="ba-header">
            <span class="ba-label">GCF</span>
            <span class="ba-badge gcf-badge">177 tokens</span>
          </div>
          <pre class="ba-code"><code>gcf 1 generic
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
1010|Soylent|954.49|shipped|10</code></pre>
        </div>
      </div>

      <p class="ba-footnote">10 rows, 5 fields. <span class="ba-highlight">61% reduction.</span> Scales to 71%+ at production sizes. Token counts verified with tiktoken (cl100k).</p>
    </div>
  </div>
</template>

<style scoped>
.ba-section {
  max-width: 1152px;
  margin: 0 auto;
  padding: 40px 24px 0;
}

.ba-inner {
  text-align: center;
}

.ba-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
}

.ba-subtitle {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin: 0 0 28px;
}

.ba-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  text-align: left;
}

.ba-card {
  border-radius: 10px;
  padding: 20px;
  overflow: hidden;
}

.json-card {
  background: rgba(178, 128, 128, 0.04);
  border: 1px solid rgba(178, 128, 128, 0.15);
}

.gcf-card {
  background: rgba(24, 190, 252, 0.04);
  border: 1px solid rgba(24, 190, 252, 0.15);
}

.ba-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.ba-label {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
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
  border: 1px solid rgba(178, 128, 128, 0.15);
}

.gcf-badge {
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.08);
  border: 1px solid rgba(24, 190, 252, 0.15);
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
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.55);
}

.gcf-card .ba-code code {
  color: rgba(255, 255, 255, 0.7);
}

.ba-fade {
  opacity: 0.3;
}

.ba-footnote {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.25);
  margin-top: 16px;
}

.ba-highlight {
  color: var(--gcf-blue, #18befc);
  font-weight: 700;
}

@media (max-width: 640px) {
  .ba-grid {
    grid-template-columns: 1fr;
  }
}
</style>
