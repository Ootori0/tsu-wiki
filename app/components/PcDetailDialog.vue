<script setup>
const pc = defineModel({ type: Object, default: null })
</script>

<template>
  <div v-if="pc" class="overlay" @click.self="pc = null">
    <div class="detail">
      <button class="close-btn" @click="pc = null">×</button>
      <div class="pc-image">
        <img v-if="pc.image_url" :src="pc.image_url" :alt="pc.name" />
        <span v-else class="pc-image-empty">NO IMAGE</span>
      </div>
      <h2 class="detail-title">{{ pcTitle(pc) }}</h2>
      <p class="meta-line">
        所属: {{ pc.affiliation || '-' }} / {{ pc.grade }}級
        <template v-if="pc.is_representative"> / 代表</template>
      </p>
      <MarkdownText :text="pc.memo" />
    </div>
  </div>
</template>

<style scoped>
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

.pc-image {
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 240px;
  margin: 8px auto 12px;
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
