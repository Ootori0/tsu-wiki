<script setup>
const { data: fetchedPcs } = await useCachedFetch('/api/pcs', {
  key: 'pcs-list',
})

const selectedPc = ref(null)
</script>

<template>
  <div class="page">
    <h1 class="page-title">PC</h1>

    <div class="card-grid">
      <button
        v-for="pc in fetchedPcs ?? []"
        :key="pc.id"
        class="pc-card"
        @click="selectedPc = pc"
      >
        <div class="pc-image">
          <img v-if="pc.image_url" :src="pc.image_url" :alt="pc.name" />
          <span v-else class="pc-image-empty">NO IMAGE</span>
        </div>
        <span class="pc-title">{{ pcTitle(pc) }}</span>
      </button>
    </div>

    <p v-if="(fetchedPcs ?? []).length === 0" class="empty-text">PCが登録されていません</p>

    <!-- 詳細表示 -->
    <div v-if="selectedPc" class="overlay" @click.self="selectedPc = null">
      <div class="detail">
        <button class="close-btn" @click="selectedPc = null">×</button>
        <div class="pc-image detail-image">
          <img v-if="selectedPc.image_url" :src="selectedPc.image_url" :alt="selectedPc.name" />
          <span v-else class="pc-image-empty">NO IMAGE</span>
        </div>
        <h2 class="detail-title">{{ pcTitle(selectedPc) }}</h2>
        <p class="meta-line">
          所属: {{ selectedPc.affiliation || '-' }} / {{ selectedPc.grade }}級
          <template v-if="selectedPc.is_representative"> / 代表</template>
        </p>
        <MarkdownText :text="selectedPc.memo" />
      </div>
    </div>
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

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.pc-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.pc-image {
  aspect-ratio: 1 / 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent, #ffd400);
  overflow: hidden;
}

.pc-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-image-empty {
  font-size: 0.75rem;
  font-weight: bold;
  opacity: 0.5;
}

.pc-title {
  padding: 8px;
  font-size: 0.8rem;
  font-weight: bold;
  line-height: 1.4;
  word-break: break-word;
}

.empty-text {
  font-size: 0.85rem;
  opacity: 0.6;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.detail {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 16px;
}

.close-btn {
  position: absolute;
  top: 6px;
  right: 8px;
  border: none;
  background: none;
  color: var(--color-text, #000);
  font-size: 1.4rem;
  cursor: pointer;
}

.detail-image {
  max-width: 240px;
  margin: 8px auto 12px;
}

.detail-title {
  font-size: 1rem;
  margin: 0 0 6px;
}

.meta-line {
  margin: 0 0 8px;
  font-size: 0.8rem;
  opacity: 0.75;
}
</style>
