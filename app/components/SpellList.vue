<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const selected = ref(null)

const open = (item) => {
  selected.value = item
}

const close = () => {
  selected.value = null
}
</script>

<template>
  <div class="spell-list">
    <div v-for="item in items" :key="item.id" class="spell-item">
      <span class="spell-name">{{ item.name }}</span>
      <button class="detail-btn" @click="open(item)">詳細</button>
    </div>

    <!-- モーダル -->
    <div v-if="selected" class="modal-overlay" @click.self="close">
      <div class="modal-box">
        <button class="close-btn" @click="close">×</button>
        <h2 class="modal-title">{{ selected.name }}</h2>

        <dl class="modal-detail">
          <dt>コスト</dt>
          <dd>{{ selected.cost }}</dd>

          <dt>発動条件</dt>
          <dd>{{ selected.condition }}</dd>

          <dt>ダメージ</dt>
          <dd>{{ selected.damage }}</dd>

          <dt>効果</dt>
          <dd>{{ selected.effect }}</dd>
        </dl>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
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
}

/* オーバーレイ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

/* モーダル本体:背景を確実に不透明white指定 */
.modal-box {
  position: relative;
  width: 100%;
  max-width: 400px;
  background-color: var(--color-bg, #ffffff);
  opacity: 1;
  border: 2px solid var(--color-text, #000);
  box-shadow: 4px 4px 0 var(--color-text, #000);
  padding: 24px 18px 18px;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 1.4rem;
  color: var(--color-text, #000);
  cursor: pointer;
}

.modal-title {
  margin: 0 0 16px;
  font-size: 1.2rem;
  color: var(--color-text, #000);
  border-bottom: 2px solid var(--color-accent, #ffd400);
  padding-bottom: 8px;
}

.modal-detail {
  display: grid;
  grid-template-columns: auto 1fr;
  row-gap: 10px;
  column-gap: 12px;
  margin: 0;
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