<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  titleKey: {
    type: String,
    default: 'title',
  },
  bodyKey: {
    type: String,
    default: 'body',
  },
  // true なら複数を同時に開ける(false だと1つ開くと他は閉じる)
  multiple: {
    type: Boolean,
    default: false,
  },
  // 最初から開いておく id
  defaultOpen: {
    type: Array,
    default: () => [],
  },
})

const openIds = ref(new Set(props.defaultOpen))
const isOpen = (id) => openIds.value.has(id)

const toggle = (id) => {
  const next = new Set(props.multiple ? openIds.value : [])
  if (isOpen(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}
</script>

<template>
  <div class="accordion-list">
    <div v-for="item in items" :key="item.id" class="accordion-item">
      <button class="accordion-header" @click="toggle(item.id)">
        <span class="accordion-title">
          <slot name="title" :item="item">{{ item[titleKey] }}</slot>
        </span>
        <span class="accordion-icon" :class="{ open: isOpen(item.id) }">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M8 5l8 7-8 7z" fill="currentColor" />
          </svg>
        </span>
      </button>

      <div class="detail-outer" :class="{ open: isOpen(item.id) }">
        <div class="detail-inner">
          <slot name="detail" :item="item" :is-open="isOpen(item.id)">
            <p class="accordion-body">{{ item[bodyKey] }}</p>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.accordion-item {
  border: 1px solid var(--color-text);
  border-left: 6px solid var(--color-accent);
  background: var(--color-bg);
  transition: box-shadow var(--transition);
}

/* 開いている項目は影を付けて浮かせる */
.accordion-item:has(> .detail-outer.open) {
  box-shadow: var(--shadow-sm);
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: none;
  border: none;
  min-height: 48px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  color: var(--color-text);
  transition: background-color var(--transition);
}

@media (hover: hover) {
  .accordion-header:hover {
    background: var(--color-accent-soft);
  }
}

.accordion-title {
  flex: 1;
  font-weight: bold;
  font-size: 0.95rem;
  word-break: break-word;
}

.accordion-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.accordion-icon.open {
  transform: rotate(90deg);
}

.detail-outer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.detail-outer.open {
  grid-template-rows: 1fr;
}

.detail-inner {
  overflow: hidden;
  min-height: 0;
}

.detail-outer.open > .detail-inner {
  border-top: 1px dashed var(--color-line);
}

.accordion-body {
  margin: 0;
  padding: 14px;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-line;
}
</style>
