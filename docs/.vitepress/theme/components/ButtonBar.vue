<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const calcRef = ref(null)
const dollars = ref([])
let frame = 0

const DOLLAR_COUNT = 4
const SPEED = 0.4

function init() {
  const signs = []
  for (let i = 0; i < DOLLAR_COUNT; i++) {
    const speedFactor = 0.4 + Math.random() * 0.6
    const g = 170 + Math.floor(Math.random() * 50)
    const r = 60 + Math.floor(Math.random() * 20)
    const b = 100 + Math.floor(Math.random() * 30)
    signs.push({
      x: 5 + Math.random() * 75,
      y: 15 + Math.random() * 35,
      vx: (Math.random() - 0.5) * SPEED * 2 * speedFactor,
      vy: (Math.random() - 0.5) * SPEED * 2 * speedFactor,
      size: 17 + Math.random() * 5,
      opacity: 0.07 + Math.random() * 0.11,
      color: `rgb(${r}, ${g}, ${b})`,
    })
  }
  dollars.value = signs
}

function tick() {
  for (const d of dollars.value) {
    d.x += d.vx
    d.y += d.vy
    if (d.x < 3 || d.x > 93) d.vx *= -1
    if (d.y < 10 || d.y > 55) d.vy *= -1
    d.x = Math.max(3, Math.min(93, d.x))
    d.y = Math.max(10, Math.min(55, d.y))
  }
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  init()
  frame = requestAnimationFrame(tick)
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
})
</script>

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
      <a href="/calculator" class="bb-alt bb-calc" ref="calcRef">
        <span
          v-for="(d, i) in dollars"
          :key="i"
          class="bb-calc__dollar"
          :style="{
            left: d.x + '%',
            top: d.y + '%',
            fontSize: d.size + 'px',
            opacity: d.opacity,
            color: d.color,
          }"
        >$</span>
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
  gap: 33px;
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
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease, outline-color 150ms ease;
}

/* Back face */
.bb-3d::before {
  transform: translate(-0.75rem, -0.75rem);
}

/* Front face */
.bb-3d::after {
  background-color: #d8ca030d;
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
  transform: translateX(0) skewY(45deg);
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 150ms ease, opacity 150ms ease, border-color 150ms ease;
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
  transition: 150ms all ease;
}

/* Hover: shift perspective */
.bb-3d:hover::before {
  transform: translate(0.75rem, -0.75rem);
}

.bb-3d:hover::after {
  background-color: #d8ca0314;
}

.bb-3d:hover .bb-3d__inner::before,
.bb-3d:hover .bb-3d__inner::after {
  transform: translateX(0.75rem) skewY(-45deg);
}

/* Active: front pushes in to meet back (back is at 0.75rem, -0.75rem during hover) */
.bb-3d:active::before {
  outline-color: transparent;
  background-color: #d8ca0316;
}

.bb-3d:active::after {
  transform: translate(0.75rem, -0.75rem);
  background-color: #d8ca0316;
  outline-color: transparent;
}

.bb-3d:active .bb-3d__inner::before,
.bb-3d:active .bb-3d__inner::after {
  width: 0;
  opacity: 0;
}

.bb-3d:active .bb-3d__text {
  transform: translate(0.75rem, -0.75rem);
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
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease, outline-color 150ms ease, outline-style 150ms ease;
}

.bb-alt::before {
  transform: translate(-0.4rem, -0.4rem);
}

.bb-alt::after {
  background-color: #0f00ff05;
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
  transform: translateX(0) skewY(45deg);
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 150ms ease, opacity 150ms ease, border-color 150ms ease;
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
  transition: 150ms all ease;
}

.bb-alt:hover {
  color: var(--gcf-blue, #18befc);
}

.bb-alt:hover::before {
  transform: translate(0.4rem, -0.4rem);
}

.bb-alt:hover::after {
  background-color: #18befc0a;
  outline-color: rgba(24, 190, 252, 0.35);
  outline-style: solid;
}

.bb-alt:hover .bb-alt__inner::before,
.bb-alt:hover .bb-alt__inner::after {
  transform: translateX(0.4rem) skewY(-45deg);
}

.bb-alt:active::before {
  outline-color: transparent;
  background-color: #0f00ff0a;
}

.bb-alt:active::after {
  transform: translate(0.4rem, -0.4rem);
  background-color: #18befc0e;
  outline-color: transparent;
}

.bb-alt:active .bb-alt__inner::before,
.bb-alt:active .bb-alt__inner::after {
  width: 0;
  opacity: 0;
}

.bb-alt:active .bb-alt__text {
  transform: translate(0.4rem, -0.4rem);
}

/* ── Calculator bouncing dollars ── */
.bb-calc__dollar {
  position: absolute;
  color: #4ade80;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  pointer-events: none;
  z-index: 0;
  user-select: none;
  will-change: left, top;
}

/* ── Calculator green tint on hover ── */
.bb-calc:hover {
  color: #4ade80;
}

.bb-calc:hover::after {
  background-color: #4ade800a;
  outline-color: rgba(74, 222, 128, 0.25);
  outline-style: solid;
}

.bb-calc:hover::before {
  outline-color: rgba(74, 222, 128, 0.15);
}

.bb-calc:hover .bb-alt__inner::before,
.bb-calc:hover .bb-alt__inner::after {
  border-color: rgba(74, 222, 128, 0.15);
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

<style>
/* Transitions on pseudo-elements must be global (Vue scoped CSS limitation) */

@keyframes drift-back {
  0%, 100% { transform: translate(-0.75rem, -0.75rem); outline-color: rgba(24, 190, 252, 0.2); }
  33% { transform: translate(calc(-0.75rem - 1.5px), calc(-0.75rem - 1px)); outline-color: rgba(24, 190, 252, 0.35); }
  66% { transform: translate(calc(-0.75rem + 1px), calc(-0.75rem + 1px)); outline-color: rgba(24, 190, 252, 0.25); }
}

.bb-3d::before {
  animation: drift-back 4.5s ease-in-out infinite !important;
}
.bb-3d:hover::before {
  animation: none !important;
  transform: translate(0.75rem, -0.75rem) !important;
  transition: transform 180ms ease, background-color 150ms ease, outline-color 150ms ease !important;
}
.bb-3d::after {
  transition: transform 180ms ease, background-color 150ms ease, outline-color 150ms ease !important;
}

.bb-3d__inner::before,
.bb-3d__inner::after {
  transition: transform 180ms ease, width 150ms ease, opacity 150ms ease, border-color 150ms ease !important;
}

.bb-alt::before,
.bb-alt::after {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms ease, outline-color 200ms ease, outline-style 0ms !important;
}

.bb-alt__inner::before,
.bb-alt__inner::after {
  transition: transform 180ms ease, width 150ms ease, opacity 150ms ease, border-color 150ms ease !important;
}

.bb-3d__text,
.bb-alt__text {
  transition: transform 180ms ease !important;
}

.bb-3d:active::before,
.bb-3d:active::after,
.bb-alt:active::before,
.bb-alt:active::after {
  outline-color: transparent !important;
  transition: 150ms all ease !important;
}

.bb-3d:active .bb-3d__inner::before,
.bb-3d:active .bb-3d__inner::after,
.bb-alt:active .bb-alt__inner::before,
.bb-alt:active .bb-alt__inner::after {
  width: 0 !important;
  opacity: 0 !important;
  transition: 150ms all ease !important;
}

.bb-3d:active .bb-3d__text {
  transition: 150ms all ease !important;
}

.bb-alt:active .bb-alt__text {
  transition: 150ms all ease !important;
}
</style>
