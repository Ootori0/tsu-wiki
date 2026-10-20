<script setup>
// 記入・編集用のポップアップ(本文はスクロールし、下のボタン欄は常に見える)
const open = defineModel({ type: Boolean, default: false })

defineProps({
  title: {
    type: String,
    default: '',
  },
})

const close = () => {
  open.value = false
}

// スマホでキーボードが出たときは、見えている範囲(visualViewport)に合わせてポップアップを縮め、
// 入力欄がキーボードの裏に隠れないようにする
const viewportStyle = ref({})
const updateViewport = () => {
  const vv = window.visualViewport
  if (!vv) return
  viewportStyle.value = { top: `${vv.offsetTop}px`, height: `${vv.height}px`, bottom: 'auto' }
}

onMounted(() => {
  window.visualViewport?.addEventListener('resize', updateViewport)
  window.visualViewport?.addEventListener('scroll', updateViewport)
  updateViewport()
})

onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', updateViewport)
  window.visualViewport?.removeEventListener('scroll', updateViewport)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="overlay" :style="viewportStyle" @click.self="close">
        <div class="dialog" role="dialog" :aria-label="title">
          <div class="dialog-head">
            <span class="dialog-title">{{ title }}</span>
            <button class="close-btn" aria-label="閉じる" @click="close">
              <v-icon icon="mdi-close" size="20" />
            </button>
          </div>

          <div class="dialog-body">
            <slot />
          </div>

          <div v-if="$slots.actions" class="dialog-actions">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1900; /* 削除の確認(ConfirmDialog)とトーストはこれより上に出す */
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 440px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  border: 2px solid #000;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  box-shadow: 6px 6px 0 #000;
}

.dialog-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 14px;
  background: var(--color-accent, #ffd400);
  border-bottom: 2px solid #000;
  color: #000;
}

.dialog-title {
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

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* スクロールバーの幅を最初から確保する(後から出ると入力欄が狭まって折り返しが増え、最後の行が欠ける) */
  scrollbar-gutter: stable;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 本文の要素を縦に縮めない(縮むと長文で入力欄が広がらなくなる。はみ出した分は本文をスクロールする) */
.dialog-body > :slotted(*) {
  flex-shrink: 0;
}

.dialog-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-top: 2px solid #000;
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
