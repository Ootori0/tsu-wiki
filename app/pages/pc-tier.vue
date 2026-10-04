<script setup>
const { data: fetchedPcs } = await useCachedFetch('/api/pcs', {
  key: 'pcs-list',
})

const grades = Array.from({ length: 10 }, (_, i) => i + 1)

const tiers = computed(() =>
  grades.map((grade) => ({
    grade,
    pcs: (fetchedPcs.value ?? []).filter((pc) => pc.grade === grade),
  }))
)

const selectedPc = ref(null)
</script>

<template>
  <div class="page">
    <h1 class="page-title">PC級一覧</h1>

    <div class="tier-table">
      <div
        v-for="tier in tiers"
        :key="tier.grade"
        class="tier-row"
        :class="{ empty: tier.pcs.length === 0 }"
      >
        <div class="tier-label">
          <span class="tier-num">{{ tier.grade }}</span>
          <span class="tier-unit">級</span>
        </div>
        <div class="tier-items">
          <button
            v-for="pc in tier.pcs"
            :key="pc.id"
            class="tier-item"
            @click="selectedPc = pc"
          >
            <div class="pc-thumb">
              <PcImage :src="pc.image_url" :alt="pc.name" :icon-size="32" />
              <span v-if="pc.is_representative" class="rep-tag">代表</span>
            </div>
            <span class="tier-name">{{ pc.name }}</span>
          </button>
          <span v-if="tier.pcs.length === 0" class="tier-empty">—</span>
        </div>
      </div>
    </div>

    <PcDetailDialog v-model="selectedPc" />
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 72px 16px 48px;
  box-sizing: border-box;
}

.page-title {
  font-size: 1.3rem;
  border-left: 5px solid var(--color-accent);
  padding-left: 10px;
  margin-bottom: 20px;
}

.tier-table {
  border: 2px solid #000;
  box-shadow: 4px 4px 0 #000;
  background: var(--color-bg, #fff);
}

.tier-row {
  display: flex;
  min-height: 96px;
}

.tier-row.empty {
  min-height: 44px;
}

.tier-row + .tier-row {
  border-top: 1px solid #000;
}

.tier-row + .tier-row .tier-label {
  box-shadow: inset 0 1px 0 rgba(255, 212, 0, 0.35);
}

.tier-label {
  flex: 0 0 56px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  align-self: stretch;
  padding-top: 10px;
  box-sizing: border-box;
  background: #000;
  color: var(--color-accent, #ffd400);
  font-weight: bold;
}

.tier-row.empty .tier-label {
  align-items: center;
  padding-top: 0;
  color: rgba(255, 212, 0, 0.55);
}

.tier-num {
  font-size: 1.5rem;
  line-height: 1;
}

.tier-unit {
  font-size: 0.7rem;
  margin-left: 1px;
}

.tier-items {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px 8px;
  padding: 10px;
  min-width: 0;
}

.tier-row.empty .tier-items {
  align-content: center;
  padding: 0 12px;
}

.tier-empty {
  font-size: 0.8rem;
  opacity: 0.3;
}

.tier-item {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none;
  background: none;
  color: var(--color-text, #000);
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}

.pc-thumb {
  position: relative;
  width: 60px;
  border: 2px solid #000;
  box-sizing: border-box;
  transition: transform 0.1s ease;
}

.rep-tag {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  color: var(--color-accent, #ffd400);
  font-size: 0.6rem;
  font-weight: bold;
  line-height: 1.5;
  text-align: center;
}

.tier-item:active .pc-thumb {
  transform: scale(0.94);
}

.tier-name {
  margin-top: 4px;
  width: 100%;
  font-size: 0.7rem;
  font-weight: bold;
  line-height: 1.3;
  text-align: center;
  word-break: break-word;
}
</style>
