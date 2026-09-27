<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '確認',
  },
  message: {
    type: String,
    default: 'この操作を実行しますか?',
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const onCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const onConfirm = () => {
  emit('update:modelValue', false)
  emit('confirm')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-box">
        <div class="confirm-icon">!</div>
        <h2 class="confirm-title">{{ title }}</h2>
        <p class="confirm-message">{{ message }}</p>

        <div class="confirm-actions">
          <button class="confirm-cancel" @click="onCancel">キャンセル</button>
          <button class="confirm-delete" @click="onConfirm">削除する</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  box-sizing: border-box;
  animation: fadeIn 0.2s ease;
}

.confirm-box {
  width: 100%;
  max-width: 320px;
  box-sizing: border-box; /* ← 追加:paddingを幅に含める */
  background: var(--color-bg, #fff);
  border: 2px solid var(--color-text, #000);
  box-shadow: 4px 4px 0 var(--color-text, #000);
  padding: 24px 20px 20px;
  text-align: center;
  animation: popIn 0.2s ease;
}

.confirm-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  border: 2px solid #c00;
  border-radius: 50%;
  color: #c00;
  font-size: 1.3rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-title {
  margin: 0 0 10px;
  font-size: 1.1rem;
  color: var(--color-text, #000);
}

.confirm-message {
  margin: 0 0 20px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text, #000);
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-cancel,
.confirm-delete {
  flex: 1;
  padding: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid var(--color-text, #000);
}

.confirm-cancel {
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
}

.confirm-delete {
  background: #c00;
  color: #fff;
  border-color: #c00;
}

.confirm-delete:active {
  background: #900;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>