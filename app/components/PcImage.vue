<script setup>
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  iconSize: { type: [Number, String], default: 56 },
  lost: { type: Boolean, default: false }, // ロストしたPCは白黒にして「LOST」の帯を重ねる
  bg: { type: String, default: '' }, // 背景色(透過した画像の後ろと、画像がないとき)。空なら標準の黄色
})
</script>

<template>
  <div class="pc-image" :class="{ lost }" :style="bg ? { backgroundColor: bg } : null">
    <img v-if="src" :src="src" :alt="alt" />
    <v-icon v-else icon="mdi-account" :size="iconSize" class="pc-image-empty" />
    <span v-if="lost" class="lost-band">LOST</span>
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

.pc-image {
  position: relative;
  container-type: inline-size; /* 帯の文字を画像の幅に合わせる */
}

/* ロスト: 白黒にして中央に帯 */
.pc-image.lost {
  filter: grayscale(1);
}

.pc-image.lost img,
.pc-image.lost .pc-image-empty {
  opacity: 0.55;
}

.lost-band {
  position: absolute;
  left: -10%;
  right: -10%;
  top: 50%;
  transform: translateY(-50%) rotate(-12deg);
  padding: 2px 0;
  background: #000;
  color: #fff;
  font-weight: bold;
  font-size: clamp(0.6rem, 18cqw, 1.4rem);
  letter-spacing: 0.2em;
  text-align: center;
  line-height: 1.4;
}

.pc-image-empty {
  color: rgba(0, 0, 0, 0.35);
}
</style>
