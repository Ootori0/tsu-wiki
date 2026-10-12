<script setup>
const { open, pcId } = useMoneyDialog()

const pcs = ref([])
const loading = ref(false)
const error = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    pcs.value = await $fetch('/api/pcs/mine')
    if (!pcs.value.some((p) => p.id === pcId.value)) pcId.value = pcs.value[0]?.id ?? null
  } catch (e) {
    error.value = e?.data?.statusMessage ?? '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

watch(open, (v) => {
  if (v) load()
})

const pc = computed(() => pcs.value.find((p) => p.id === pcId.value) ?? null)

const onUpdated = async () => {
  await load()
  // マイページ・店・カジノの自分のPC一覧も最新にする
  await refreshNuxtData('my-pcs-list')
}

const close = () => {
  open.value = false
}
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="overlay" @click.self="close">
      <div class="dialog" role="dialog" aria-label="所持金">
        <div class="dialog-head">
          <span class="dialog-title">所持金</span>
          <button class="close-btn" aria-label="閉じる" @click="close">
            <v-icon icon="mdi-close" size="20" />
          </button>
        </div>

        <div class="dialog-body">
          <p v-if="error" class="error">{{ error }}</p>
          <p v-else-if="!loading && pcs.length === 0" class="empty">PCがありません。マイページでPCを作成してください。</p>

          <template v-else-if="pc">
            <select v-if="pcs.length > 1" v-model="pcId" class="pc-select">
              <option v-for="p in pcs" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <div class="balance">
              <span class="balance-name">{{ pc.name }}</span>
              <span class="balance-value" :class="{ negative: pc.money < 0 }">{{ formatMoney(pc.money) }}</span>
            </div>
            <PcMoneyPanel :key="pc.id" :pc="pc" hide-head @updated="onUpdated" />
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  border: 2px solid #000;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  box-shadow: 6px 6px 0 #000;
}

.dialog-head {
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
  padding: 12px 0 4px;
}

.pc-select {
  display: block;
  width: calc(100% - 24px);
  margin: 0 12px 10px;
  border: 1px solid #000;
  padding: 8px;
  background-color: var(--color-bg, #fff);
}

.balance {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0 12px;
  padding: 10px 12px;
  background: #000;
  color: var(--color-accent, #ffd400);
}

.balance-name {
  font-size: 0.85rem;
  font-weight: bold;
}

.balance-value {
  font-size: 1.3rem;
  font-weight: bold;
}

.balance-value.negative {
  color: #ff6b6b;
}

.error {
  margin: 0 12px;
  color: var(--color-error, #c62828);
  font-size: 0.85rem;
}

.empty {
  margin: 0 12px 8px;
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
