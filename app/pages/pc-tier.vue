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
      <div v-for="tier in tiers" :key="tier.grade" class="tier-row">
        <div class="tier-label">{{ tier.grade }}級</div>
        <div class="tier-items">
          <button
            v-for="pc in tier.pcs"
            :key="pc.id"
            class="tier-item"
            @click="selectedPc = pc"
          >
            <div class="pc-thumb">
              <img v-if="pc.image_url" :src="pc.image_url" :alt="pc.name" />
              <span v-else class="pc-thumb-empty">NO IMAGE</span>
            </div>
            <span class="tier-name">{{ pc.name }}</span>
          </button>
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
  margin-bottom: 16px;
}

.tier-table {
  border: 1px solid var(--color-text, #000);
}

.tier-row {
  display: flex;
  min-height: 84px;
}

.tier-row + .tier-row {
  border-top: 1px solid var(--color-text, #000);
}

.tier-label {
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent, #ffd400);
  color: #000;
  font-weight: bold;
  font-size: 0.9rem;
  border-right: 1px solid var(--color-text, #000);
}

.tier-items {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
  min-width: 0;
}

.tier-item {
  width: 64px;
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
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  overflow: hidden;
  box-sizing: border-box;
}

.pc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-thumb-empty {
  font-size: 0.55rem;
  font-weight: bold;
  opacity: 0.5;
}

.tier-name {
  margin-top: 2px;
  width: 100%;
  font-size: 0.7rem;
  line-height: 1.3;
  text-align: center;
  word-break: break-word;
}
</style>
