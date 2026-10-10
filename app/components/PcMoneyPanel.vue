<script setup>
const props = defineProps({
  pc: { type: Object, required: true },
})
const emit = defineEmits(['updated'])
const { show } = useToast()

const amount = ref(null)
const reason = ref('')
const saving = ref(false)
const error = ref('')
const showLogs = ref(false)

const { data: logs, refresh: refreshLogs, execute: loadLogs } = useFetch(
  () => `/api/pcs/${props.pc.id}/money-logs`,
  { key: `money-logs-${props.pc.id}`, immediate: false, watch: false }
)

const toggleLogs = async () => {
  showLogs.value = !showLogs.value
  if (showLogs.value) await loadLogs()
}

const canSubmit = computed(() =>
  Number.isInteger(amount.value) && amount.value > 0 && reason.value.trim() && !saving.value
)

const submit = async (sign) => {
  if (!canSubmit.value) return
  error.value = ''
  saving.value = true
  try {
    await $fetch(`/api/pcs/${props.pc.id}/money`, {
      method: 'POST',
      body: { amount: sign * amount.value, reason: reason.value },
    })
    show(`所持金を${sign > 0 ? '+' : '-'}${formatMoney(amount.value)}しました`)
    amount.value = null
    reason.value = ''
    emit('updated')
    if (showLogs.value) await refreshLogs()
  } catch (e) {
    error.value = e?.data?.statusMessage ?? '更新に失敗しました'
  } finally {
    saving.value = false
  }
}

const KIND_LABELS = {
  manual: '手動',
  purchase: '購入',
  sale: '売上',
  casino: 'カジノ',
  dealer: 'ディーラー',
}

const describe = (log) => {
  switch (log.kind) {
    case 'manual': return log.detail
    case 'purchase':
    case 'sale': return `[${log.sub.split(' ')[0]}] ${log.detail} ${log.sub.split(' ')[1] ?? ''}`
    case 'casino': return `チンチロ ${handLabel(log.detail)}(掛金${formatMoney(log.sub)})`
    case 'dealer': return `チンチロ ${log.sub ?? '(削除済みPC)'}の${handLabel(log.detail)}`
    default: return log.detail
  }
}
</script>

<template>
  <div class="money-panel">
    <div class="money-head">
      <span class="money-label">所持金</span>
      <span class="money-value" :class="{ negative: pc.money < 0 }">{{ formatMoney(pc.money) }}</span>
    </div>

    <div class="money-form">
      <div class="money-row">
        <input
          v-model.number="amount"
          type="number"
          min="1"
          step="1"
          placeholder="金額"
          class="money-input"
        />
        <span class="money-unit">{{ MONEY_UNIT }}</span>
      </div>
      <input v-model="reason" type="text" placeholder="理由(例: セッション報酬)" class="money-input reason" />
      <div class="money-actions">
        <button class="money-btn plus" :disabled="!canSubmit" @click="submit(1)">増やす</button>
        <button class="money-btn minus" :disabled="!canSubmit" @click="submit(-1)">減らす</button>
      </div>
      <p v-if="error" class="money-error">{{ error }}</p>
    </div>

    <button class="logs-toggle" @click="toggleLogs">
      {{ showLogs ? '▼' : '▶' }} 所持金の履歴
    </button>
    <div v-if="showLogs" class="logs">
      <div v-for="log in logs ?? []" :key="`${log.kind}-${log.id}`" class="log-row">
        <span class="log-date">{{ formatDateTime(log.created_at) }}</span>
        <span class="log-detail">
          <span class="log-kind" :class="log.kind">{{ KIND_LABELS[log.kind] }}</span>
          {{ describe(log) }}
        </span>
        <span class="log-amount" :class="{ plus: log.amount > 0, minus: log.amount < 0 }">
          {{ log.amount > 0 ? '+' : '' }}{{ formatMoney(log.amount) }}
        </span>
      </div>
      <p v-if="(logs ?? []).length === 0" class="empty">履歴はありません</p>
    </div>
  </div>
</template>

<style scoped>
.money-panel {
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
}

.money-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.money-label {
  font-size: 0.75rem;
  font-weight: bold;
}

.money-value {
  font-size: 1.1rem;
  font-weight: bold;
}

.money-value.negative {
  color: #c00;
}

.money-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.money-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.money-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 6px 8px;
  font-size: 16px;
  font-family: inherit;
}

.money-input.reason {
  width: 100%;
}

.money-unit {
  font-size: 0.8rem;
}

.money-actions {
  display: flex;
  gap: 6px;
}

.money-btn {
  flex: 1;
  border: 1px solid #000;
  padding: 6px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  font-family: inherit;
}

.money-btn.plus {
  background: var(--color-accent, #ffd400);
  color: #000;
}

.money-btn.minus {
  background: #000;
  color: #fff;
}

.money-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.money-error {
  margin: 0;
  font-size: 0.75rem;
  color: #c00;
}

.logs-toggle {
  margin-top: 10px;
  border: none;
  background: none;
  padding: 0;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-text, #000);
  cursor: pointer;
  font-family: inherit;
}

.logs {
  margin-top: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.log-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 6px;
  align-items: baseline;
  padding: 5px 0;
  border-bottom: 1px dashed var(--color-text, #000);
  font-size: 0.75rem;
}

.log-date {
  font-size: 0.65rem;
  opacity: 0.6;
}

.log-detail {
  word-break: break-word;
}

.log-kind {
  display: inline-block;
  margin-right: 3px;
  padding: 0 4px;
  font-size: 0.6rem;
  font-weight: bold;
  border: 1px solid #000;
}

.log-kind.manual {
  background: var(--color-accent, #ffd400);
  color: #000;
}

.log-kind.casino,
.log-kind.dealer {
  background: #000;
  color: var(--color-accent, #ffd400);
}

.log-amount {
  font-weight: bold;
  white-space: nowrap;
}

.plus {
  color: #080;
}

.minus {
  color: #c00;
}

</style>
