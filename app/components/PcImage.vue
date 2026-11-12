<script setup>
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  iconSize: { type: [Number, String], default: 56 },
  bg: { type: String, default: '' }, // 背景色(透過した画像の後ろと、画像がないとき)。空なら標準の黄色
})
</script>

<template>
  <div class="pc-image" :style="bg ? { backgroundColor: bg } : null">
    <img v-if="src" :src="src" :alt="alt" />
    <v-icon v-else icon="mdi-account" :size="iconSize" class="pc-image-empty" />
  </div>
</template>

<style scoped>
.pc-image {
  aspect-ratio: 1 / 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--color-accent, #ffd400);
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(0, 0, 0, 0.06) 0 6px,
    transparent 6px 12px
  );
}

.pc-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-image-empty {
  color: rgba(0, 0, 0, 0.35);
}
</style>
