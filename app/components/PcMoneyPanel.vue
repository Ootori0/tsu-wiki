<script setup>
const props = defineProps({
  pc: { type: Object, required: true },
  // 親の見出しに所持金を出している場合は非表示にする
  hideHead: { type: Boolean, default: false },
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

const isLedger = computed(() => props.pc.money_mode === 'ledger')

// --- 出納帳: 清算 ---
const showSettleConfirm = ref(false)
const settle = async () => {
  saving.value = true
  try {
    await $fetch(`/api/pcs/${props.pc.id}/settle`, { method: 'POST' })
    show('清算しました(未清算を0に戻しました)')
    emit('updated')
    if (showLogs.value) await refreshLogs()
  } catch (e) {
    show(e?.data?.statusMessage ?? '清算に失敗しました', 'error')
  } finally {
    saving.value = false
  }
}

// --- 所持金 ⇔ 出納帳 の切替 ---
const showModeConfirm = ref(false)
const startMoney = ref(0)
const switchMode = async () => {
  saving.value = true
  try {
    const mode = isLedger.value ? 'money' : 'ledger'
    await $fetch(`/api/pcs/${props.pc.id}/money-mode`, {
      method: 'POST',
      body: { mode, money: startMoney.value },
    })
    show(mode === 'ledger' ? '出納帳に切り替えました' : '所持金に切り替えました')
    emit('updated')
    if (showLogs.value) await refreshLogs()
  } catch (e) {
    show(e?.data?.statusMessage ?? '切り替えに失敗しました', 'error')
  } finally {
    saving.value = false
  }
}
const modeConfirmMessage = computed(() =>
  isLedger.value
    ? `所持金に切り替え、${formatMoney(startMoney.value || 0)}から始めます。よろしいですか?`
    : `出納帳に切り替えます。今の所持金(${formatMoney(props.pc.money)})は使わなくなり、未清算0から記録を始めます。よろしいですか?`
)

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

</script>

<template>
  <div class="money-panel" :class="{ flat: hideHead }">
    <div v-if="!hideHead" class="money-head">
      <span class="money-label">{{ moneyLabel(pc) }}</span>
      <span class="money-value" :class="{ negative: pc.money < 0 }">{{ formatBalance(pc) }}</span>
    </div>

    <!-- 出納帳: 未清算の合計と清算 -->
    <div v-if="isLedger" class="ledger">
      <p class="ledger-note">
        出納帳では、wiki上の収入・出費(店・カジノ・売上)を記録します。ココフォリアの所持金に反映したら「清算する」で0に戻してください。
      </p>
      <button class="money-btn plus settle-btn" :disabled="saving || pc.money === 0" @click="showSettleConfirm = true">
        清算する(ココフォリアに反映済み)
      </button>
    </div>

    <div v-else class="money-form">
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
      {{ showLogs ? '▼' : '▶' }} {{ isLedger ? '出納帳' : '所持金の履歴' }}
    </button>
    <div v-if="showLogs" class="logs">
      <div v-for="log in logs ?? []" :key="`${log.kind}-${log.id}`" class="log-row">
        <span class="log-date">{{ formatDateTime(log.created_at) }}</span>
        <span class="log-detail">
          <span class="log-kind" :class="log.kind">{{ MONEY_LOG_KIND_LABELS[log.kind] }}</span>
          {{ describeMoneyLog(log) }}
        </span>
        <span class="log-amount" :class="{ plus: log.amount > 0, minus: log.amount < 0 }">
          {{ log.amount > 0 ? '+' : '' }}{{ formatMoney(log.amount) }}
        </span>
      </div>
      <p v-if="(logs ?? []).length === 0" class="empty">履歴はありません</p>
    </div>

    <!-- 方式の切替 -->
    <details class="mode-switch">
      <summary>{{ isLedger ? '所持金に切り替える' : '出納帳に切り替える(所持金を秘匿する)' }}</summary>
      <div class="mode-body">
        <template v-if="isLedger">
          <p class="ledger-note">未清算が0のときだけ切り替えられます。ココフォリアの今の所持金を入力してください。</p>
          <div class="money-row">
            <input v-model.number="startMoney" type="number" step="1" class="money-input" />
            <span class="money-unit">{{ MONEY_UNIT }}</span>
          </div>
          <button class="money-btn minus" :disabled="saving || pc.money !== 0 || !Number.isInteger(startMoney)" @click="showModeConfirm = true">
            所持金に切り替える
          </button>
        </template>
        <template v-else>
          <p class="ledger-note">所持金をwikiに載せず、wiki上の収入・出費だけを記録します。店やカジノで残高の確認はされません。</p>
          <button class="money-btn minus" :disabled="saving" @click="showModeConfirm = true">出納帳に切り替える</button>
        </template>
      </div>
    </details>

    <ConfirmDialog
      v-model="showSettleConfirm"
      title="清算"
      :message="`未清算の${formatBalance(pc)}をココフォリアに反映しましたか?清算すると0に戻ります。`"
      confirm-label="清算する"
      :danger="false"
      @confirm="settle"
    />
    <ConfirmDialog
      v-model="showModeConfirm"
      title="方式の切替"
      :message="modeConfirmMessage"
      confirm-label="切り替える"
      :danger="false"
      @confirm="switchMode"
    />
  </div>
</template>

<style scoped>
.money-panel {
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
}

.money-panel.flat {
  margin: 0;
  border: none;
  padding: 12px;
}

.money-panel.flat .money-form {
  margin-top: 0;
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

.ledger {
  margin-top: 4px;
}

.ledger-note {
  margin: 0 0 8px;
  font-size: 0.78rem;
  line-height: 1.6;
  opacity: 0.8;
}

.settle-btn {
  width: 100%;
}

.mode-switch {
  margin-top: 12px;
  font-size: 0.8rem;
}

.mode-switch summary {
  cursor: pointer;
  font-weight: bold;
}

.mode-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
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
