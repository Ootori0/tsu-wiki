<script setup>
const route = useRoute()
const router = useRouter()

const { data: fetchedPcs } = await useCachedFetch('/api/pcs', {
  key: 'pcs-list',
})
const { data: allAffiliations } = await useCachedFetch('/api/affiliations', {
  key: 'affiliations-list',
})

// 表示: 所属別(カード) / 級別(ティア表)。URL の ?view=tier で級別を開ける(旧「PC級一覧」からのリンク)
const VIEWS = [
  { value: 'group', label: '所属別' },
  { value: 'tier', label: '級別' },
]
const view = computed({
  get: () => (route.query.view === 'tier' ? 'tier' : 'group'),
  set: (v) => router.replace({ query: { ...route.query, view: v === 'tier' ? 'tier' : undefined } }),
})

// 絞り込み: 名前・事務所で検索、所属
const searchText = ref('')
const affiliationFilter = ref('')

const filteredPcs = computed(() => {
  let list = fetchedPcs.value ?? []
  const q = searchText.value.trim()
  if (q) list = list.filter((pc) => pc.name.includes(q) || (pc.office ?? '').includes(q))
  if (affiliationFilter.value === '__none') list = list.filter((pc) => !pc.affiliation)
  else if (affiliationFilter.value) list = list.filter((pc) => pc.affiliation === affiliationFilter.value)
  return list
})

// 所属ごとにまとめる(APIは所属→級→名前順)
const groups = computed(() => {
  const map = new Map()
  for (const pc of filteredPcs.value) {
    const key = pc.affiliation || '無所属'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(pc)
  }
  // 無所属は最後に回す
  return [...map]
    .map(([affiliation, pcs]) => ({ affiliation, pcs }))
    .sort((a, b) => (a.affiliation === '無所属') - (b.affiliation === '無所属'))
})

const selectedPc = ref(null)
</script>

<template>
  <div class="page">
    <h1 class="page-title">PC<span class="page-count">{{ (fetchedPcs ?? []).length }}名</span></h1>

    <!-- 表示の切り替えと絞り込み -->
    <div class="toolbar">
      <div class="view-switch" role="tablist">
        <button
          v-for="v in VIEWS"
          :key="v.value"
          class="view-btn"
          :class="{ active: view === v.value }"
          role="tab"
          :aria-selected="view === v.value"
          @click="view = v.value"
        >
          {{ v.label }}
        </button>
      </div>
      <input v-model="searchText" type="search" placeholder="名前・事務所で検索" class="search-input" />
      <select v-model="affiliationFilter" class="affiliation-select" aria-label="所属で絞り込み">
        <option value="">すべての所属</option>
        <option v-for="a in allAffiliations ?? []" :key="a.id" :value="a.name">{{ a.name }}</option>
        <option value="__none">無所属</option>
      </select>
      <p v-if="searchText || affiliationFilter" class="filter-result">{{ filteredPcs.length }}名が該当</p>
    </div>

    <!-- 所属別: カード -->
    <template v-if="view === 'group'">
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
              <span class="grade-tag">{{ pc.grade }}級</span>
              <span v-if="pc.is_representative || pc.is_office_representative" class="rep-badge">代表</span>
            </div>
            <div class="card-body">
              <span class="card-name">{{ pc.name }}</span>
              <span v-if="pc.office" class="card-office">{{ pc.office }}</span>
            </div>
          </button>
        </div>
      </section>
    </template>

    <!-- 級別: ティア表 -->
    <PcTierTable v-else :pcs="filteredPcs" @select="selectedPc = $event" />

    <p v-if="(fetchedPcs ?? []).length === 0" class="empty">PCが登録されていません</p>
    <p v-else-if="filteredPcs.length === 0" class="empty">条件に合うPCがいません</p>

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

.page-count {
  margin-left: 8px;
  font-size: 0.8rem;
  font-weight: normal;
  opacity: 0.6;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
}

.view-switch {
  grid-column: 1 / -1;
  display: flex;
  border: 2px solid var(--color-text, #000);
}

.view-btn {
  flex: 1;
  border: none;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
}

.view-btn + .view-btn {
  border-left: 2px solid var(--color-text, #000);
}

.view-btn.active {
  background: var(--color-accent, #ffd400);
}

.search-input,
.affiliation-select {
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  background-color: var(--color-bg, #fff);
  padding: 8px 10px;
}

.filter-result {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.78rem;
  opacity: 0.7;
}

.rep-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 7px;
  font-size: 0.65rem;
  font-weight: bold;
  line-height: 1.4;
  background: var(--color-accent, #ffd400);
  color: #000;
  border: 1px solid #000;
}

.card-office {
  font-size: 0.68rem;
  opacity: 0.65;
  line-height: 1.3;
  word-break: break-word;
}

/* カードの画像は横長にして、一覧を詰めて見られるようにする */
.card-image :deep(.pc-image) {
  aspect-ratio: 4 / 3;
}
</style>
