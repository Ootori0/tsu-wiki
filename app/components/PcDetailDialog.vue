<script setup>
const pc = defineModel({ type: Object, default: null })
</script>

<template>
  <Transition name="fade">
    <div v-if="pc" class="overlay" @click.self="pc = null">
      <div class="detail">
        <div class="detail-band">
          <span class="band-label">{{ pc.affiliation || '無所属' }}</span>
          <button class="close-btn" aria-label="閉じる" @click="pc = null">
            <v-icon icon="mdi-close" size="20" />
          </button>
        </div>

        <div class="detail-head">
          <div class="detail-image">
            <PcImage :src="pc.image_url" :alt="pc.name" :icon-size="64" />
          </div>
          <div class="detail-names">
            <span v-if="pcRank(pc)" class="detail-rank">{{ pcRank(pc) }}</span>
            <h2 class="detail-name">{{ pc.name }}</h2>
          </div>
        </div>

        <dl class="detail-meta">
          <div class="meta-item">
            <dt>所属</dt>
            <dd>{{ pc.affiliation || '-' }}</dd>
          </div>
          <div class="meta-item">
            <dt>級</dt>
            <dd>{{ pc.grade }}級</dd>
          </div>
          <div class="meta-item">
            <dt>役職</dt>
            <dd>{{ pc.is_representative ? '代表' : '-' }}</dd>
          </div>
        </dl>

        <div v-if="pc.memo" class="detail-memo">
          <MarkdownText :text="pc.memo" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.detail {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  border: 2px solid #000;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  box-shadow: 6px 6px 0 #000;
}

.detail-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 14px;
  background: var(--color-accent, #ffd400);
  color: #000;
  border-bottom: 2px solid #000;
}

.band-label {
  font-size: 0.8rem;
  font-weight: bold;
  letter-spacing: 0.1em;
}

.close-btn {
  display: flex;
  border: none;
  background: none;
  color: #000;
  padding: 2px;
  cursor: pointer;
}

.detail-head {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  padding: 16px 16px 12px;
}

.detail-image {
  flex: 0 0 120px;
  border: 2px solid #000;
}

.detail-names {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-rank {
  font-size: 0.75rem;
  opacity: 0.7;
  word-break: break-word;
}

.detail-name {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.3;
  word-break: break-word;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 16px 16px;
  border-top: 1px solid var(--color-text, #000);
  border-bottom: 1px solid var(--color-text, #000);
}

.meta-item {
  padding: 8px 0;
  text-align: center;
}

.meta-item + .meta-item {
  border-left: 1px solid var(--color-text, #000);
}

.meta-item dt {
  font-size: 0.65rem;
  opacity: 0.6;
}

.meta-item dd {
  margin: 2px 0 0;
  font-size: 0.85rem;
  font-weight: bold;
}

.detail-memo {
  padding: 0 16px 18px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
