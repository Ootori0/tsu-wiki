<script setup>
defineProps({
  pcs: { type: Array, default: () => [] },
  pc: { type: Object, default: null },
})
const selectedId = defineModel({ type: Number, default: null })
</script>

<template>
  <div class="wallet">
    <label class="wallet-label">使用するPC</label>
    <select v-model="selectedId" class="wallet-select">
      <option v-for="p in pcs" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
    <div class="wallet-money">
      <span class="money-label">所持金</span>
      <span class="money-value" :class="{ negative: (pc?.money ?? 0) < 0 }">{{ formatMoney(pc?.money) }}</span>
    </div>
  </div>
</template>

<style scoped>
.wallet {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 4px 12px;
  padding: 12px 14px;
  border: 2px solid #000;
  background: #000;
  color: var(--color-accent, #ffd400);
  margin-bottom: 20px;
}

.wallet-label {
  grid-column: 1 / -1;
  font-size: 0.7rem;
  font-weight: bold;
  opacity: 0.8;
}

.wallet-select {
  min-width: 0;
  border: 1px solid var(--color-accent, #ffd400);
  background: #000;
  color: var(--color-accent, #ffd400);
  padding: 6px 8px;
  font-size: 0.9rem;
  font-family: inherit;
}

.wallet-money {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.money-label {
  font-size: 0.65rem;
  opacity: 0.8;
}

.money-value {
  font-size: 1.2rem;
  font-weight: bold;
  line-height: 1.2;
}

.money-value.negative {
  color: #ff6b6b;
}
</style>
