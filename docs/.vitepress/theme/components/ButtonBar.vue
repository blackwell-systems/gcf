<template>
  <div class="button-bar">
    <div class="button-bar-inner">
      <a href="/guide/getting-started" class="bb-btn bb-brand">
        <span class="bb-text-wrap">
          <span class="bb-top" aria-hidden="true">Get Started</span>
          <span class="bb-bottom" aria-hidden="true">Get Started</span>
          <span class="bb-arrow" aria-hidden="true">
            <span class="bb-arrow-line"></span>
            <span class="bb-arrow-head"></span>
          </span>
        </span>
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
  border-radius: 10px;
  text-decoration: none;
  letter-spacing: 0.01em;
  border: 1.5px solid transparent;
  transition: background 0.4s ease, color 0.4s ease,
              box-shadow 0.4s ease, border-color 0.3s ease;
}

/* ── Get Started (brand CTA) ── */
.bb-brand {
  border-color: var(--gcf-blue, #18befc);
  color: var(--gcf-blue, #18befc);
  background: transparent;
  font-weight: 700;
  overflow: hidden;
  position: relative;
}

.bb-brand:hover {
  background: var(--gcf-blue, #18befc);
  color: #000;
  box-shadow: 0 0 28px rgba(24, 190, 252, 0.35);
}

/* Text wrapper: positions the two halves + arrow */
.bb-text-wrap {
  position: relative;
  display: inline-block;
}

/* Both halves share the same text, stacked exactly */
.bb-top,
.bb-bottom {
  display: block;
  white-space: nowrap;
  will-change: transform;
  transition: transform 0.55s cubic-bezier(0.77, 0, 0.175, 1);
}

.bb-top {
  clip-path: inset(0 0 48% 0);
}

.bb-bottom {
  position: absolute;
  inset: 0;
  clip-path: inset(52% 0 0 0);
}

/* Arrow: thin line + chevron, starts left of text */
.bb-arrow {
  position: absolute;
  top: 50%;
  left: 0;
  display: flex;
  align-items: center;
  transform: translate(-110%, -50%);
  will-change: transform;
  transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
  pointer-events: none;
}

.bb-arrow-line {
  width: 22px;
  height: 1.5px;
  background: currentColor;
  border-radius: 1px;
}

.bb-arrow-head {
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid currentColor;
  margin-left: -1px;
}

/* ── Hover: split + arrow travels ── */
.bb-brand:hover .bb-top {
  transform: translateY(-3px);
}

.bb-brand:hover .bb-bottom {
  transform: translateY(3px);
}

.bb-brand:hover .bb-arrow {
  transform: translate(calc(100% + 10px), -50%);
}

/* ── Alt buttons ── */
.bb-alt {
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
}

.bb-alt:hover {
  border-color: rgba(24, 190, 252, 0.4);
  color: var(--gcf-blue, #18befc);
  box-shadow: 0 0 20px rgba(24, 190, 252, 0.15);
  transform: translateY(-2px);
}

/* ── Mobile ── */
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
