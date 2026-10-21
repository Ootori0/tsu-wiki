<script setup>
// 記入・編集用のポップアップ
// ・PC: 画面中央のポップアップ。下端に「保存・キャンセル」(と #extra の削除など)
// ・スマホ: 全画面で開き、上端の帯に「キャンセル | タイトル | 保存」を置く(一般的なスマホアプリの作成画面と同じ形)。
//   キーボードが出ても保存が隠れない。削除など(#extra)は本文の末尾に置く
// 入力中のスクロールはブラウザ標準に任せる
const open = defineModel({ type: Boolean, default: false })

defineProps({
  title: { type: String, default: '' },
  saveLabel: { type: String, default: '保存' },
  saveDisabled: { type: Boolean, default: false },
})

const emit = defineEmits(['save'])

const close = () => {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="overlay" @click.self="close">
        <div class="dialog" role="dialog" :aria-label="title">
          <div class="dialog-head">
            <button class="head-btn head-cancel" @click="close">キャンセル</button>
            <span class="dialog-title">{{ title }}</span>
            <button class="head-btn head-save" :disabled="saveDisabled" @click="emit('save')">{{ saveLabel }}</button>
            <button class="close-btn" aria-label="閉じる" @click="close">
              <v-icon icon="mdi-close" size="20" />
            </button>
          </div>

          <div class="dialog-body">
            <slot />
            <div v-if="$slots.extra" class="body-extra">
              <slot name="extra" />
            </div>
          </div>

          <div class="dialog-actions">
            <button class="action-btn action-save" :disabled="saveDisabled" @click="emit('save')">{{ saveLabel }}</button>
            <button class="action-btn" @click="close">キャンセル</button>
            <div v-if="$slots.extra" class="actions-extra">
              <slot name="extra" />
            </div>
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
  gap: 8px;
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

/* 上端のキャンセル・保存はスマホだけ */
.head-btn {
  display: none;
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

/* 本文末尾の削除などはスマホだけ */
.body-extra {
  display: none;
}

.dialog-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-top: 2px solid #000;
}

.action-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 8px 16px;
  font-size: 0.85rem;
  cursor: pointer;
}

.action-save {
  background: var(--color-accent, #ffd400);
  color: #000;
  font-weight: bold;
}

.action-btn:disabled,
.head-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.actions-extra {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

/* ---------- スマホ: 全画面 + 上端に「キャンセル | タイトル | 保存」 ---------- */
@media (max-width: 600px) {
  .overlay {
    padding: 0;
    align-items: stretch;
  }

  .dialog {
    max-width: none;
    height: 100%;
    border: none;
    box-shadow: none;
  }

  .dialog-head {
    padding: 4px 6px;
    min-height: 48px;
  }

  .dialog-title {
    flex: 1;
    text-align: center;
    font-size: 0.95rem;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .head-btn {
    display: block;
    flex-shrink: 0;
    border: none;
    background: none;
    color: #000;
    padding: 8px 10px;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .head-save {
    font-weight: bold;
    background: #000;
    color: var(--color-accent, #ffd400);
  }

  .close-btn,
  .dialog-actions {
    display: none;
  }

  .body-extra {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px dashed var(--color-line, rgba(0, 0, 0, 0.14));
  }
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
