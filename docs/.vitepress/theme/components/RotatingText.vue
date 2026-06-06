<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const phrases = [
  'agentic comprehension',
  'token efficiency',
  'structural accuracy',
  'the reader that matters',
]

const currentIndex = ref(0)
const phase = ref<'in' | 'out'>('in')
let interval: ReturnType<typeof setInterval>

onMounted(() => {
  interval = setInterval(() => {
    phase.value = 'out'
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % phrases.length
      phase.value = 'in'
    }, 350)
  }, 2800)
})

onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="rotating-wrap">
    <span class="rotating-static">Wire format optimized for</span>
    <span class="rotating-slot">
      <span :class="['rotating-word', phase]">{{ phrases[currentIndex] }}</span>
    </span>
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

.rotating-slot {
  display: inline-block;
  width: 320px;
  text-align: left;
  overflow: hidden;
  vertical-align: bottom;
  height: 1.6em;
  position: relative;
}

.rotating-word {
  color: var(--vp-c-brand-1);
  font-weight: 800;
  display: block;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.rotating-word.in {
  opacity: 1;
  transform: translateY(0);
}

.rotating-word.out {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
