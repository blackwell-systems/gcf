<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const phrases = [
  'agentic comprehension',
  'token efficiency',
  'structural accuracy',
  'the reader that matters',
]

const currentIndex = ref(0)
const animClass = ref('visible')
let interval: ReturnType<typeof setInterval>

onMounted(() => {
  interval = setInterval(() => {
    animClass.value = 'exit'
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % phrases.length
      animClass.value = 'enter'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animClass.value = 'visible'
        })
      })
    }, 400)
  }, 3000)
})

onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="rotating-wrap">
    <div class="rotating-label">Wire format optimized for</div>
    <div class="rotating-slot">
      <div :class="['rotating-word', animClass]">{{ phrases[currentIndex] }}</div>
    </div>
  </div>
</template>

<style scoped>
.rotating-wrap {
  text-align: center;
  padding: 24px 0 12px;
}

.rotating-label {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.rotating-slot {
  height: 2.4rem;
  overflow: hidden;
}

.rotating-word {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  line-height: 2.4rem;
}

.rotating-word.visible {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.rotating-word.exit {
  opacity: 0;
  transform: translateY(-2.4rem);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.rotating-word.enter {
  opacity: 0;
  transform: translateY(2.4rem);
  transition: none;
}
</style>
