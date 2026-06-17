<script setup>
defineProps({
  variant: { type: Number, default: 1 }
})
</script>

<template>
  <div class="divider" :class="`divider-${variant}`">
    <div class="divider-line"></div>
    <div class="divider-accent"></div>
  </div>
</template>

<style scoped>
.divider {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px;
  height: 32px;
  display: flex;
  align-items: center;
  position: relative;
}

.divider-line {
  width: 100%;
  height: 1px;
}

.divider-accent {
  position: absolute;
}

/* Variant 1: centered diamond with gradient line */
.divider-1 .divider-line {
  background: linear-gradient(90deg, transparent, rgba(24, 190, 252, 0.08) 30%, rgba(24, 190, 252, 0.08) 70%, transparent);
}

.divider-1 .divider-accent {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 5px;
  height: 5px;
  background: rgba(24, 190, 252, 0.15);
}

/* Variant 2: offset dot pair with asymmetric line */
.divider-2 .divider-line {
  background: linear-gradient(90deg, transparent 10%, rgba(24, 190, 252, 0.06) 30%, rgba(24, 190, 252, 0.1) 60%, transparent 90%);
}

.divider-2 .divider-accent {
  right: 38%;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(24, 190, 252, 0.12);
  box-shadow: -20px 0 0 rgba(24, 190, 252, 0.07);
}

/* Variant 3: left-weighted tick mark */
.divider-3 .divider-line {
  background: linear-gradient(90deg, rgba(24, 190, 252, 0.12) 0%, rgba(24, 190, 252, 0.06) 20%, transparent 60%);
}

.divider-3 .divider-accent {
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 1px;
  background: rgba(24, 190, 252, 0.2);
}
</style>
