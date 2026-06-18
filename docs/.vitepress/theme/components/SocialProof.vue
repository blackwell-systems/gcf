<template>
  <div class="proof-wrap">
    <div class="proof-inner">
      <span class="proof-label">Adopted by</span>
      <span class="proof-items">
        <a href="https://omniroute.online" target="_blank" class="proof-item">♦️ OmniRoute <span class="proof-stars">6.1K ★</span></a>
        <span class="proof-sep">·</span>
        <a href="https://github.com/automateyournetwork/netclaw" target="_blank" class="proof-item">🦞 NetClaw <span class="proof-stars">556 ★</span></a>
        <span class="proof-sep">·</span>
        <a href="https://github.com/stevesolun/ctx" target="_blank" class="proof-item">ctx <span class="proof-stars">510 ★</span></a>
        <span class="proof-sep">·</span>
        <a href="https://opendataproducts.org/sdk/" target="_blank" class="proof-item">Open Data Products SDK <span class="proof-stars">(Linux Foundation)</span></a>
        <span class="proof-sep">·</span>
        <a href="https://github.com/NETGVai/NeuroNest" target="_blank" class="proof-item"><span class="nn-logo">🧠</span> NeuroNest</a>
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

@keyframes nn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.nn-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 10px;
  border-radius: 50%;
  position: relative;
  vertical-align: middle;
}

.nn-logo::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: conic-gradient(#a855f7, #4ade80, #a855f7);
  animation: nn-spin 6s linear infinite;
  z-index: -1;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
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
