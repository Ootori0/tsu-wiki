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

// スマホでキーボードが出たときは、見えている範囲(visualViewport)いっぱいにポップアップを広げ、
// 入力欄がキーボードの裏に隠れないようにする。文字を書く場所を広く取るため、
// その間は余白を詰め、保存などのボタン欄は本文の末尾(スクロールした先)に回す
const viewportStyle = ref({})
const keyboardOpen = ref(false)
const updateViewport = () => {
  const vv = window.visualViewport
  if (!vv) return
  viewportStyle.value = { top: `${vv.offsetTop}px`, height: `${vv.height}px`, bottom: 'auto', '--vv-height': `${vv.height}px` }
  // キーボードで画面の高さ自体が縮む端末もあるので、同じ横幅で一番高かったときと比べる(横幅が変わったら画面の向きが変わったとみなす)
  if (window.innerWidth !== fullWidth) {
    fullWidth = window.innerWidth
    fullHeight = 0
  }
  fullHeight = Math.max(fullHeight, window.innerHeight)
  keyboardOpen.value = vv.height < fullHeight * 0.8
}
let fullWidth = 0
let fullHeight = 0

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
      <div v-if="open" class="overlay" :class="{ 'keyboard-open': keyboardOpen }" :style="viewportStyle" @click.self="close">
        <div class="dialog" role="dialog" :aria-label="title">
          <div class="dialog-head">
            <span class="dialog-title">{{ title }}</span>
            <button class="close-btn" aria-label="閉じる" @click="close">
              <v-icon icon="mdi-close" size="20" />
            </button>
          </div>

          <div class="dialog-body">
            <slot />
            <div v-if="$slots.actions && keyboardOpen" class="dialog-actions in-body">
              <slot name="actions" />
            </div>
          </div>

          <div v-if="$slots.actions && !keyboardOpen" class="dialog-actions">
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

/* キーボード表示中: 画面いっぱいに広げ、見出しも細くする */
.overlay.keyboard-open {
  padding: 0;
}

.overlay.keyboard-open .dialog {
  max-width: none;
  height: 100%;
  border-width: 0;
  box-shadow: none;
}

.overlay.keyboard-open .dialog-head {
  padding: 2px 6px 2px 12px;
  font-size: 0.85rem;
}

.overlay.keyboard-open .dialog-body {
  padding: 10px;
  /* 末尾の行も見えている範囲の中央まで上げられるよう、下に余白を足す */
  padding-bottom: calc(var(--vv-height, 0px) * 0.5);
}

.dialog-actions.in-body {
  flex-shrink: 0;
  margin: 8px -10px -10px;
  border-top: 1px dashed var(--color-line, rgba(0, 0, 0, 0.14));
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
