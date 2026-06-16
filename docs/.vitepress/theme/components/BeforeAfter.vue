<template>
  <div class="ba-wrap">
    <div class="ba-grid">
      <div class="ba-card json-card">
        <div class="ba-label">JSON</div>
        <pre class="ba-code"><code>{
  "orders": [
    {
      "id": 1001,
      "customer": "Acme Corp",
      "total": 249.99,
      "status": "shipped",
      "items": 3
    },
    {
      "id": 1002,
      "customer": "Globex Inc",
      "total": 89.50,
      "status": "pending",
      "items": 1
    },
    {
      "id": 1003,
      "customer": "Initech LLC",
      "total": 1024.00,
      "status": "shipped",
      "items": 7
    }
  ]
}</code></pre>
        <div class="ba-badge json-badge">~380 tokens</div>
      </div>

      <div class="ba-arrow">→</div>

      <div class="ba-card gcf-card">
        <div class="ba-label">GCF</div>
        <pre class="ba-code"><code>gcf 1 generic
## orders [3]{id,customer,total,status,items}
1001|Acme Corp|249.99|shipped|3
1002|Globex Inc|89.50|pending|1
1003|Initech LLC|1024.00|shipped|7</code></pre>
        <div class="ba-badge gcf-badge">~45 tokens</div>
      </div>
    </div>
    <p class="ba-caption">Same data. <span class="ba-highlight">88% fewer tokens.</span> Zero information loss.</p>
  </div>
</template>

<style scoped>
.ba-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 24px 0;
}

.ba-grid {
  display: flex;
  align-items: center;
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
  font-size: 0.78rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.65);
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
}

.ba-caption {
  text-align: center;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.4);
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
  }
}
</style>
