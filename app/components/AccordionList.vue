<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
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
        <span class="accordion-title">{{ item.title }}</span>
        <span class="accordion-icon" :class="{ open: openId === item.id }">▶</span>
      </button>

      <!-- transitionコンポーネントは使わず、CSSのgrid-template-rowsで開閉 -->
      <div class="accordion-body-outer" :class="{ open: openId === item.id }">
        <div class="accordion-body-inner">
          <p class="accordion-body">{{ item.body }}</p>
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
}

.accordion-icon {
  font-size: 0.8rem;
  color: var(--color-text, #000);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.accordion-icon.open {
  transform: rotate(90deg);
}

/* grid-template-rowsで実際の高さに追従したスムーズな開閉 */
.accordion-body-outer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.accordion-body-outer.open {
  grid-template-rows: 1fr;
}

.accordion-body-inner {
  overflow: hidden;
  min-height: 0;
}

.accordion-body-outer.open .accordion-body-inner {
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