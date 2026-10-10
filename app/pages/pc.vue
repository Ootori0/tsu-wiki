<script setup>
const { data: fetchedPcs } = await useCachedFetch('/api/pcs', {
  key: 'pcs-list',
})

// 所属ごとにまとめる(APIは所属→級→名前順)
const groups = computed(() => {
  const map = new Map()
  for (const pc of fetchedPcs.value ?? []) {
    const key = pc.affiliation || '無所属'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(pc)
  }
  return [...map].map(([affiliation, pcs]) => ({ affiliation, pcs }))
})

const selectedPc = ref(null)
</script>

<template>
  <div class="page">
    <h1 class="page-title">PC</h1>

    <section v-for="group in groups" :key="group.affiliation" class="group">
      <h2 class="group-heading">
        <span>{{ group.affiliation }}</span>
        <span class="group-count">{{ group.pcs.length }}名</span>
      </h2>

      <div class="card-grid">
        <button
          v-for="pc in group.pcs"
          :key="pc.id"
          class="pc-card"
          @click="selectedPc = pc"
        >
          <div class="card-image">
            <PcImage :src="pc.image_url" :alt="pc.name" />
            <span v-if="pc.show_title" class="grade-tag">{{ pc.grade }}級</span>
          </div>
          <div class="card-body">
            <span v-for="part in pcRankParts(pc)" :key="part" class="card-rank">{{ part }}</span>
            <span class="card-name">{{ pc.name }}</span>
          </div>
        </button>
      </div>
    </section>

    <p v-if="groups.length === 0" class="empty">PCが登録されていません</p>

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

.group + .group {
  margin-top: 28px;
}

.group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 0 12px;
  padding-bottom: 4px;
  font-size: 0.95rem;
  border-bottom: 2px solid var(--color-text, #000);
}

.group-count {
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.6;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.pc-card {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  box-shadow: 4px 4px 0 var(--color-text, #000);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.pc-card:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 var(--color-text, #000);
}

.card-image {
  position: relative;
  border-bottom: 2px solid var(--color-text, #000);
}

.grade-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 7px;
  font-size: 0.7rem;
  font-weight: bold;
  line-height: 1.4;
  background: #000;
  color: var(--color-accent, #ffd400);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px 10px;
  min-width: 0;
}

.card-rank {
  font-size: 0.68rem;
  opacity: 0.7;
  line-height: 1.3;
  word-break: break-word;
}

.card-name {
  font-size: 0.95rem;
  font-weight: bold;
  line-height: 1.3;
  word-break: break-word;
}

.empty-text {
  font-size: 0.85rem;
  opacity: 0.6;
}
</style>
