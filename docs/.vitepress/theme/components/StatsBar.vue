<template>
  <div class="stats-bar">
    <div class="stats-bar-inner">
      <div class="stat">
        <span class="stat-number">33B+</span>
        <span class="stat-label">Lossless Round-Trips</span>
      </div>
      <div class="stat">
        <span class="stat-number">100%</span>
        <span class="stat-label">General Comprehension</span>
      </div>
      <div class="stat">
        <span class="stat-number">90.7%</span>
        <span class="stat-label">Adversarial Comprehension</span>
      </div>
      <div class="stat">
        <span class="stat-number">71%</span>
        <span class="stat-label">Fewer Tokens vs JSON</span>
      </div>
      <div class="stat">
        <span class="stat-number">6</span>
        <span class="stat-label">Language SDKs</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-bar {
  max-width: 1152px;
  margin: 0 auto;
  padding: 24px 24px 8px;
}

.stats-bar-inner {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--gcf-blue, #18befc);
  letter-spacing: -0.02em;
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

@media (max-width: 640px) {
  .stats-bar-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px 16px;
  }
  .stat-number {
    font-size: 1.4rem;
  }
  .stat-label {
    font-size: 0.65rem;
  }
}
</style>
