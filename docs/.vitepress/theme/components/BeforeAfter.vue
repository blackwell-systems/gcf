<template>
  <div class="ba-wrap">
    <div class="ba-grid">
      <div class="ba-card json-card">
        <div class="ba-label">JSON</div>
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
    <span class="ba-fade">{"id": 1004, "customer": "Umbrella Co",
     "total": 351.49, "status": "delivered",
     "items": 4},
    ... 6 more rows ...</span>
  ]
}</code></pre>
        <div class="ba-badge json-badge">458 tokens</div>
      </div>

      <div class="ba-arrow">→</div>

      <div class="ba-card gcf-card">
        <div class="ba-label">GCF</div>
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
        <div class="ba-badge gcf-badge">177 tokens</div>
      </div>
    </div>
    <p class="ba-caption">Same data. 10 rows. <span class="ba-highlight">61% fewer tokens.</span> Zero information loss. Scales to 71%+ at production sizes.</p>
  </div>
</template>

<style scoped>
.ba-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 0;
}

.ba-grid {
  display: flex;
  align-items: stretch;
  gap: 16px;
}

.ba-card {
  flex: 1;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.json-card {
  background: rgba(178, 128, 128, 0.06);
  border: 1px solid rgba(178, 128, 128, 0.2);
}

.gcf-card {
  background: rgba(24, 190, 252, 0.06);
  border: 1px solid rgba(24, 190, 252, 0.2);
}

.ba-label {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
}

.json-card .ba-label {
  color: var(--json-color, #b28080);
}

.gcf-card .ba-label {
  color: var(--gcf-blue, #18befc);
}

.ba-code {
  margin: 0;
  padding: 0;
  background: none;
  overflow-x: auto;
}

.ba-code code {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.6);
}

.ba-fade {
  opacity: 0.3;
}

.ba-badge {
  display: inline-block;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 8px;
  margin-top: 16px;
}

.json-badge {
  color: var(--json-color, #b28080);
  background: rgba(178, 128, 128, 0.1);
  border: 1px solid rgba(178, 128, 128, 0.2);
}

.gcf-badge {
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.1);
  border: 1px solid rgba(24, 190, 252, 0.2);
}

.ba-arrow {
  font-size: 1.8rem;
  color: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.ba-caption {
  text-align: center;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 16px;
}

.ba-highlight {
  color: var(--gcf-blue, #18befc);
  font-weight: 700;
}

@media (max-width: 640px) {
  .ba-grid {
    flex-direction: column;
  }
  .ba-arrow {
    transform: rotate(90deg);
    justify-content: center;
  }
}
</style>
