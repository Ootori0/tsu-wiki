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
  <div class="spell-list">
    <div v-for="item in items" :key="item.id" class="spell-item">
      <div class="spell-row">
        <span class="spell-name">{{ item.name }}</span>
        <button class="detail-btn" @click="toggle(item.id)">
          {{ openId === item.id ? '閉じる' : '詳細' }}
        </button>
      </div>

      <!-- grid-template-rowsで開閉 -->
      <div class="detail-outer" :class="{ open: openId === item.id }">
        <div class="detail-inner">
          <dl class="modal-detail">
            <dt>コスト</dt>
            <dd>{{ item.cost }}</dd>

            <dt>発動条件</dt>
            <dd>{{ item.condition }}</dd>

            <dt>ダメージ</dt>
            <dd>{{ item.damage }}</dd>

            <dt>効果</dt>
            <dd>{{ item.effect }}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spell-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spell-item {
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
}

.spell-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.spell-name {
  font-weight: bold;
  font-size: 1rem;
  color: var(--color-text, #000);
}

.detail-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: var(--color-text, #000);
  font-size: 0.8rem;
  padding: 4px 10px;
  cursor: pointer;
  flex-shrink: 0;
}

/* grid-template-rowsで実際の高さに追従したスムーズな開閉 */
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

.modal-detail {
  display: grid;
  grid-template-columns: auto 1fr;
  row-gap: 10px;
  column-gap: 12px;
  margin: 0;
  padding: 14px;
}

.modal-detail dt {
  font-weight: bold;
  font-size: 0.85rem;
  color: var(--color-text, #000);
  white-space: nowrap;
}

.modal-detail dd {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text, #000);
}
</style>