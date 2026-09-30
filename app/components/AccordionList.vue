<script setup>
defineProps({
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
})

const openId = ref(null)

const toggle = (id) => {
  openId.value = openId.value === id ? null : id
}
</script>

<template>
  <div class="accordion-list">
    <div v-for="item in items" :key="item.id" class="accordion-item">
      <button class="accordion-header" @click="toggle(item.id)">
        <span class="accordion-title">{{ item[titleKey] }}</span>
        <span class="accordion-icon" :class="{ open: openId === item.id }">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M8 5l8 7-8 7z" fill="currentColor" />
          </svg>
        </span>
      </button>

      <div class="detail-outer" :class="{ open: openId === item.id }">
        <div class="detail-inner">
          <slot name="detail" :item="item" :is-open="openId === item.id">
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
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
}

.accordion-title {
  font-weight: bold;
  font-size: 1rem;
  color: var(--color-text, #000);
  word-break: break-word;
}

.accordion-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text, #000);
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

.detail-outer.open .detail-inner {
  border-top: 1px dashed var(--color-text, #000);
}

.accordion-body {
  margin: 0;
  padding: 14px;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text, #000);
  white-space: pre-line;
}
</style>