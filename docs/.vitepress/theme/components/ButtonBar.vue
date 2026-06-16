<template>
  <div class="button-bar">
    <div class="button-bar-inner">
      <a href="/guide/getting-started" class="bb-btn bb-brand">
        <span class="bb-text">Get Started</span>
        <span class="bb-arrow">→</span>
      </a>
      <a href="/playground" class="bb-btn bb-alt">Try the Playground</a>
      <a href="/calculator" class="bb-btn bb-alt">Cost Calculator</a>
      <a href="/guide/vs-toon" class="bb-btn bb-alt">GCF vs TOON</a>
    </div>
  </div>
</template>

<style scoped>
.button-bar {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.button-bar-inner {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bb-btn {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.3s,
              border-color 0.3s,
              color 0.3s;
}

.bb-brand {
  background: var(--gcf-blue, #18befc);
  color: #000;
  font-weight: 700;
  gap: 8px;
  box-shadow: 0 0 24px rgba(24, 190, 252, 0.25),
              0 4px 12px rgba(0, 0, 0, 0.2);
}

.bb-brand:hover {
  background: #fff;
  color: #000;
  box-shadow: 0 0 36px rgba(255, 255, 255, 0.3),
              0 6px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.bb-arrow {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 1.1em;
}

.bb-brand:hover .bb-arrow {
  transform: translateX(4px);
}

.bb-alt {
  border: 1px solid rgba(24, 190, 252, 0.12);
  color: rgba(255, 255, 255, 0.7);
  background: rgba(24, 190, 252, 0.04);
}

.bb-alt:hover {
  border-color: rgba(24, 190, 252, 0.3);
  color: #fff;
  background: rgba(24, 190, 252, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(24, 190, 252, 0.1);
}

@media (max-width: 640px) {
  .button-bar {
    padding: 0 16px 24px;
  }
  .button-bar-inner {
    gap: 8px;
  }
  .bb-btn {
    padding: 10px 16px;
    font-size: 0.8rem;
    width: 100%;
    justify-content: center;
  }
}
</style>
