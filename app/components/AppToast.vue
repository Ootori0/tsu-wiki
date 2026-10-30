<script setup>
const { toasts, dismiss } = useToast()

const runAction = (t) => {
  dismiss(t.id)
  t.action.handler()
}
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-area" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="{ 'toast-error': t.type === 'error' }"
      :role="t.type === 'error' ? 'alert' : 'status'"
      @click="dismiss(t.id)"
    >
      <span class="toast-icon">{{ t.type === 'error' ? '!' : '✓' }}</span>
      <span>{{ t.message }}</span>
      <button v-if="t.action" class="toast-action" @click.stop="runAction(t)">{{ t.action.label }}</button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-area {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
  max-width: calc(100vw - 24px);
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-text);
  border-left: 6px solid var(--color-accent);
  box-shadow: 3px 3px 0 var(--color-text);
  padding: 10px 14px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
}

.toast-action {
  flex-shrink: 0;
  margin-left: 4px;
  border: 1px solid var(--color-text);
  background: var(--color-text);
  color: var(--color-accent);
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
}

.toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  background: var(--color-accent);
  border: 1px solid var(--color-text);
  font-size: 0.75rem;
}

.toast-error {
  color: var(--color-error);
  border-color: var(--color-error);
  border-left-color: var(--color-error);
  box-shadow: 3px 3px 0 var(--color-error);
}

.toast-error .toast-icon {
  background: var(--color-error);
  border-color: var(--color-error);
  color: #fff;
}

.toast-enter-active,
.toast-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(calc(100% + 24px));
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
