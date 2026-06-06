<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const phrases = [
  'agentic comprehension',
  'token efficiency',
  'structural accuracy',
  'the reader that matters',
]

const currentIndex = ref(0)
const visible = ref(true)
let interval: ReturnType<typeof setInterval>

onMounted(() => {
  interval = setInterval(() => {
    visible.value = false
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % phrases.length
      visible.value = true
    }, 400)
  }, 2800)
})

onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="rotating-wrap">
    <span class="rotating-static">Wire format optimized for </span>
    <span :class="['rotating-word', { 'rotating-visible': visible }]">{{ phrases[currentIndex] }}</span>
  </div>
</template>

<style scoped>
.rotating-wrap {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  padding: 20px 0 8px;
  letter-spacing: -0.01em;
}

.rotating-static {
  color: var(--vp-c-text-2);
}

.rotating-word {
  color: var(--vp-c-brand-1);
  font-weight: 800;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.35s ease, transform 0.35s ease;
  display: inline-block;
}

.rotating-word.rotating-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
