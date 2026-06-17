<template>
  <div class="button-band">
  <div class="button-bar">
    <div class="button-bar-inner">
      <a href="/guide/getting-started" class="bb-3d">
        <span class="bb-3d__inner">
          <span class="bb-3d__text">Get Started</span>
        </span>
      </a>
      <a href="/playground" class="bb-alt">
        <span class="bb-alt__inner"><span class="bb-alt__text">Try the Playground</span></span>
      </a>
      <a href="/calculator" class="bb-alt">
        <span class="bb-alt__inner"><span class="bb-alt__text">Cost Calculator</span></span>
      </a>
      <a href="/guide/vs-toon" class="bb-alt">
        <span class="bb-alt__inner"><span class="bb-alt__text">GCF vs TOON</span></span>
      </a>
    </div>
  </div>
  </div>
</template>

<style scoped>
.button-band {
  background: #000307b3;
  padding: 32px 0;
  width: 100vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

.button-bar {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px;
}

.button-bar-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

/* ── Get Started (3D parallax) ── */
.bb-3d {
  position: relative;
  padding: 14px 48px;
  color: var(--gcf-blue, #18befc);
  text-transform: uppercase;
  letter-spacing: 0.4em;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  cursor: pointer;
}

/* Front and back faces */
.bb-3d::before,
.bb-3d::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  outline: 1px dashed rgba(24, 190, 252, 0.3);
  width: 100%;
  height: 100%;
  transition: 250ms all ease;
}

/* Back face */
.bb-3d::before {
  transform: translate(-0.75rem, -0.75rem);
}

/* Front face */
.bb-3d::after {
  background-color: rgba(24, 190, 252, 0.04);
  outline-style: solid;
  outline-color: rgba(24, 190, 252, 0.4);
}

/* Side panels */
.bb-3d__inner::before,
.bb-3d__inner::after {
  content: "";
  border: 1px dashed rgba(24, 190, 252, 0.3);
  border-left: 0;
  border-right: 0;
  width: 0.75rem;
  height: calc(100% + 2px);
  position: absolute;
  top: -0.375rem;
  transform: translateX(var(--tx, 0)) skewY(var(--sy, 45deg));
  transition: 250ms all ease;
}

/* Left panel */
.bb-3d__inner::before {
  left: -0.75rem;
}

/* Right panel */
.bb-3d__inner::after {
  left: calc(100% - 0.75rem);
}

/* Text */
.bb-3d__text {
  z-index: 1;
  position: relative;
  display: inline-block;
  transition: 250ms all ease;
}

/* Hover: shift perspective */
.bb-3d:hover::before {
  transform: translate(0.75rem, -0.75rem);
}

.bb-3d:hover::after {
  background-color: rgba(24, 190, 252, 0.1);
}

.bb-3d:hover .bb-3d__inner::before,
.bb-3d:hover .bb-3d__inner::after {
  --tx: 0.75rem;
  --sy: -45deg;
}

/* Active: press in */
.bb-3d:active::after {
  transform: translate(0.375rem, -0.375rem);
}

.bb-3d:active .bb-3d__inner::before,
.bb-3d:active .bb-3d__inner::after {
  width: 0.375rem;
  transform: translate(1.125rem, calc(-0.1875rem - 2px)) skewY(-45deg);
}

.bb-3d:active .bb-3d__text {
  transform: translate(0.375rem, -0.375rem);
}

/* ── Alt buttons (subtle 3D) ── */
.bb-alt {
  position: relative;
  padding: 12px 28px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  cursor: pointer;
}

.bb-alt::before,
.bb-alt::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  outline: 1px dashed rgba(24, 190, 252, 0.12);
  width: 100%;
  height: 100%;
  transition: 250ms all ease;
}

.bb-alt::before {
  transform: translate(-0.4rem, -0.4rem);
}

.bb-alt::after {
  background-color: rgba(24, 190, 252, 0.02);
  outline-style: dashed;
  outline-color: rgba(24, 190, 252, 0.2);
}

.bb-alt__inner::before,
.bb-alt__inner::after {
  content: "";
  border: 1px dashed rgba(24, 190, 252, 0.12);
  border-left: 0;
  border-right: 0;
  width: 0.4rem;
  height: calc(100% + 2px);
  position: absolute;
  top: -0.2rem;
  transform: translateX(var(--tx, 0)) skewY(var(--sy, 45deg));
  transition: 250ms all ease;
}

.bb-alt__inner::before {
  left: -0.4rem;
}

.bb-alt__inner::after {
  left: calc(100% - 0.4rem);
}

.bb-alt__text {
  z-index: 1;
  position: relative;
  display: inline-block;
  transition: 250ms all ease;
}

.bb-alt:hover {
  color: var(--gcf-blue, #18befc);
}

.bb-alt:hover::before {
  transform: translate(0.4rem, -0.4rem);
}

.bb-alt:hover::after {
  background-color: rgba(24, 190, 252, 0.04);
  outline-color: rgba(24, 190, 252, 0.35);
}

.bb-alt:hover .bb-alt__inner::before,
.bb-alt:hover .bb-alt__inner::after {
  --tx: 0.4rem;
  --sy: -45deg;
}

.bb-alt:active::after {
  transform: translate(0.2rem, -0.2rem);
}

.bb-alt:active .bb-alt__inner::before,
.bb-alt:active .bb-alt__inner::after {
  width: 0.2rem;
  transform: translate(0.6rem, calc(-0.1rem - 2px)) skewY(-45deg);
}

.bb-alt:active .bb-alt__text {
  transform: translate(0.2rem, -0.2rem);
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .button-bar {
    padding: 0 16px 24px;
  }
  .button-bar-inner {
    gap: 8px;
  }
  .bb-alt,
  .bb-3d {
    font-size: 0.75rem;
    width: 100%;
    text-align: center;
  }
  .bb-alt {
    padding: 10px 16px;
  }
  .bb-3d {
    padding: 12px 24px;
  }
}
</style>
