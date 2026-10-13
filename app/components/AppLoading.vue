<script setup>
// ローディング画面
// ・サイトを開いた直後: サーバーで描画した画面に重ねて出し、画面が操作できるようになったら消す
// ・ページ移動中: 読み込みが 0.2 秒を超えたときだけ出す(すぐ終わる移動ではちらつかせない)
const { isLoading } = useLoadingIndicator({ throttle: 200, hideDelay: 100 })

const booting = ref(true)
onMounted(() => {
  booting.value = false
})

const visible = computed(() => booting.value || isLoading.value)
</script>

<template>
  <Transition name="loading-fade">
    <div v-if="visible" class="loading-screen" role="status" aria-live="polite">
      <svg viewBox="0 0 100 100" class="loading-icon" aria-hidden="true">
        <rect x="20" y="20" width="60" height="60" class="fill-bg" />
        <g class="frame-group">
          <line x1="42" y1="20" x2="100" y2="20" class="frame-line" />
          <line x1="80" y1="0" x2="80" y2="58" class="frame-line" />
          <line x1="0" y1="80" x2="58" y2="80" class="frame-line" />
          <line x1="20" y1="42" x2="20" y2="100" class="frame-line" />
        </g>
      </svg>
      <span class="loading-text">Loading</span>
    </div>
  </Transition>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 3000; /* メニュー・ポップアップ・トーストより上 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--color-page, #f6f5ef);
}

.loading-icon {
  width: 88px;
  height: 88px;
  overflow: visible;
}

.fill-bg {
  fill: var(--color-accent, #ffd400);
}

.frame-line {
  stroke: var(--color-text, #000);
  stroke-width: 4;
  stroke-linecap: square;
}

/* メニューボタンの枠線と同じ形を、止まりながら回す */
.frame-group {
  transform-box: view-box;
  transform-origin: 50px 50px;
  animation: frame-spin 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

@keyframes frame-spin {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(90deg); }
  100% { transform: rotate(180deg); }
}

.loading-text {
  font-size: 0.8rem;
  font-weight: bold;
  letter-spacing: 0.3em;
  animation: text-blink 1.6s ease-in-out infinite;
}

@keyframes text-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  .frame-group,
  .loading-text {
    animation: none;
  }
}

.loading-fade-leave-active {
  transition: opacity 0.25s ease;
}

.loading-fade-enter-active {
  transition: opacity 0.15s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
