<script setup>
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  iconSize: { type: [Number, String], default: 56 },
})
</script>

<template>
  <div class="pc-image">
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
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(0, 0, 0, 0.06) 0 6px,
      transparent 6px 12px
    ),
    var(--color-accent, #ffd400);
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
