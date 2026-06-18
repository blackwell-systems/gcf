<template>
  <div class="proof-wrap">
    <div class="proof-inner">
      <span class="proof-label">Adopted by</span>
      <span class="proof-items">
        <a href="https://github.com/diegosouzapw/OmniRoute" target="_blank" class="proof-item">♦️ OmniRoute <span class="proof-stars">6.1K ★</span></a>
        <span class="proof-sep">·</span>
        <a href="https://github.com/automateyournetwork/netclaw" target="_blank" class="proof-item">🦞 NetClaw <span class="proof-stars">556 ★</span></a>
        <span class="proof-sep">·</span>
        <a href="https://github.com/stevesolun/ctx" target="_blank" class="proof-item">ctx <span class="proof-stars">510 ★</span></a>
        <span class="proof-sep">·</span>
        <a href="https://opendataproducts.org/sdk/" target="_blank" class="proof-item">Open Data Products SDK <span class="proof-stars">(Linux Foundation)</span></a>
        <span class="proof-sep">·</span>
        <a href="https://github.com/blackwell-systems/agent-lsp" target="_blank" class="proof-item">agent-lsp</a>
        <span class="proof-sep">·</span>
        <a href="/ecosystem/adopters" class="proof-item proof-more">and more</a>
      </span>
    </div>
  </div>
</template>

<style scoped>
.proof-wrap {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 24px;
}

.proof-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.proof-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.proof-items {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.proof-item {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;
}

.proof-item:hover {
  color: var(--gcf-blue, #18befc);
}

.proof-stars {
  font-size: 0.65rem;
  color: rgba(24, 190, 252, 0.5);
  font-weight: 700;
}

.proof-sep {
  color: rgba(255, 255, 255, 0.15);
  font-size: 0.7rem;
}

.proof-more {
  color: rgba(24, 190, 252, 0.4);
  font-style: italic;
}

.proof-more:hover {
  color: var(--gcf-blue, #18befc);
}

@media (max-width: 640px) {
  .proof-inner {
    flex-direction: column;
    gap: 6px;
  }
  .proof-items {
    gap: 6px;
  }
}
</style>
