<script setup>
const { data: fetchedTags } = await useFetch('/api/tags')

const tabs = ['すべて', '魔法', '魔道具', 'AF', '魔術・その他']
const activeTab = ref('すべて')

const searchName = ref('')
const selectedTags = ref([])
const selectedPerms = ref([])

// admin/KP/SKP のみ公開権限で絞り込み可能
const { user } = useAuth()
const canFilterByPerm = computed(() =>
  (user.value?.permissions ?? []).some((p) => ['admin', 'KP', 'SKP'].includes(p))
)
const { data: allPermsList } = await useCachedFetch('/api/permissions', {
  key: 'permissions-list',
  immediate: canFilterByPerm.value,
})

const { data: fetchedItems, refresh } = await useCachedFetch('/api/magics', {
  key: computed(() => `magics-list-${activeTab.value}`),
  query: computed(() => ({ type: activeTab.value })),
})

const filteredItems = computed(() => {
  let list = fetchedItems.value ?? []

  if (searchName.value) {
    list = list.filter((item) => item.name.includes(searchName.value))
  }

  if (selectedTags.value.length > 0) {
    list = list.filter((item) =>
      selectedTags.value.every((tag) => item.tags.includes(tag))
    )
  }

  if (canFilterByPerm.value && selectedPerms.value.length > 0) {
    list = list.filter((item) =>
      selectedPerms.value.some((perm) => item.visible_permissions.includes(perm))
    )
  }

  return list
})

const toggleTag = (tagName) => {
  const idx = selectedTags.value.indexOf(tagName)
  if (idx === -1) {
    selectedTags.value.push(tagName)
  } else {
    selectedTags.value.splice(idx, 1)
  }
}

const togglePerm = (permName) => {
  const idx = selectedPerms.value.indexOf(permName)
  if (idx === -1) {
    selectedPerms.value.push(permName)
  } else {
    selectedPerms.value.splice(idx, 1)
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">魔法</h1>

    <!-- タブ -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- 名前検索 -->
    <div class="search-row">
      <input v-model="searchName" type="text" placeholder="名前で検索" class="search-input" />
    </div>

    <!-- タグ選択式検索 -->
    <div class="tag-filter">
      <span class="tag-filter-label">タグで絞り込み</span>
      <div class="tag-chip-list">
        <button
          v-for="tag in fetchedTags ?? []"
          :key="tag.id"
          class="tag-chip"
          :class="{ active: selectedTags.includes(tag.name) }"
          @click="toggleTag(tag.name)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>

    <!-- 公開権限で絞り込み(admin/KP/SKPのみ) -->
    <div v-if="canFilterByPerm" class="tag-filter">
      <span class="tag-filter-label">公開権限で絞り込み</span>
      <div class="tag-chip-list">
        <button
          v-for="perm in allPermsList ?? []"
          :key="perm.id"
          class="tag-chip"
          :class="{ active: selectedPerms.includes(perm.name) }"
          @click="togglePerm(perm.name)"
        >
          {{ perm.name }}
        </button>
      </div>
    </div>

    <AccordionList :items="filteredItems" title-key="name">
      <template #detail="{ item }">
        <div class="magic-detail">
          <p class="meta-line">区分: {{ item.type }} / 使用者: {{ item.owner || '-' }}</p>
          <p class="meta-line">コスト: {{ item.cost || '-' }} / 発動条件: {{ item.condition || '-' }}</p>
          <MarkdownText :text="item.effect" />
        </div>
      </template>
    </AccordionList>
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

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tab-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--color-accent, #ffd400);
  font-weight: bold;
}

.search-row {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 8px 10px;
  font-size: 0.85rem;
}

.tag-filter {
  margin-bottom: 16px;
}

.tag-filter-label {
  display: block;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-text, #000);
  margin-bottom: 6px;
}

.tag-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 4px 10px;
  font-size: 0.78rem;
  border-radius: 12px;
  cursor: pointer;
}

.tag-chip.active {
  background: var(--color-accent, #ffd400);
  font-weight: bold;
}

.magic-detail {
  padding: 14px;
}

.meta-line {
  margin: 0 0 4px;
  font-size: 0.8rem;
  opacity: 0.75;
}

.magic-effect {
  margin: 6px 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-line;
  color: var(--color-text, #000);
}
</style>