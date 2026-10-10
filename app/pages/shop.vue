<script setup>
definePageMeta({ middleware: 'auth' })

const { myPcs, refreshMyPcs, selectedPcId, selectedPc } = await useMyPcs()

const { data: items, refresh: refreshItemsRaw } = await useFetch('/api/shop/items', {
  key: 'shop-items',
})

const { data: purchases, refresh: refreshPurchases } = await useFetch('/api/shop/purchases', {
  key: 'shop-purchases',
  query: computed(() => ({ pcId: selectedPcId.value })),
  immediate: !!selectedPcId.value,
  watch: [selectedPcId],
})

const shops = ['魔法店', '武器屋']
const activeShop = ref('魔法店')

const shopItems = computed(() =>
  (items.value ?? []).filter((item) => item.shop === activeShop.value)
)

const quantities = ref({})
const qtyOf = (item) => quantities.value[item.id] ?? 1

const canBuy = (item) => {
  if (!selectedPc.value) return false
  const qty = qtyOf(item)
  if (!Number.isInteger(qty) || qty < 1) return false
  if (item.stock !== null && item.stock < qty) return false
  return selectedPc.value.money >= item.price * qty
}

const pending = ref(null)
const showConfirm = ref(false)
const buying = ref(false)
const message = ref('')
const errorMessage = ref('')

const requestBuy = (item) => {
  message.value = ''
  errorMessage.value = ''
  pending.value = { item, quantity: qtyOf(item) }
  showConfirm.value = true
}

const confirmMessage = computed(() => {
  if (!pending.value) return ''
  const { item, quantity } = pending.value
  return `${selectedPc.value?.name}で「${item.name}」を${quantity}個、合計${formatMoney(item.price * quantity)}で購入しますか?`
})

const buy = async () => {
  if (!pending.value || !selectedPc.value) return
  const { item, quantity } = pending.value
  buying.value = true
  try {
    await $fetch('/api/shop/purchase', {
      method: 'POST',
      body: { pcId: selectedPc.value.id, itemId: item.id, quantity },
    })
    message.value = `「${item.name}」を${quantity}個購入しました`
    quantities.value[item.id] = 1
  } catch (e) {
    errorMessage.value = e?.data?.statusMessage ?? '購入に失敗しました'
  } finally {
    buying.value = false
    pending.value = null
    await Promise.all([refreshItemsRaw(), refreshMyPcs(), refreshPurchases()])
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">魔法店/武器屋</h1>

    <p v-if="(myPcs ?? []).length === 0" class="notice">
      購入するにはマイページでPCを作成してください
    </p>
    <PcWallet v-else v-model="selectedPcId" :pcs="myPcs ?? []" :pc="selectedPc" />

    <div class="tab-bar">
      <button
        v-for="shop in shops"
        :key="shop"
        class="tab-btn"
        :class="{ active: activeShop === shop }"
        @click="activeShop = shop"
      >
        {{ shop }}
      </button>
    </div>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <div class="item-list">
      <div
        v-for="item in shopItems"
        :key="item.id"
        class="item"
        :class="{ soldout: item.stock === 0 }"
      >
        <div class="item-head">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-price">{{ formatMoney(item.price) }}</span>
        </div>
        <p class="item-stock">
          <template v-if="item.stock === null">在庫: 無制限</template>
          <template v-else-if="item.stock === 0">売り切れ</template>
          <template v-else>在庫: {{ item.stock }}</template>
        </p>
        <p v-if="item.sellers?.length" class="item-sellers">
          販売者: {{ item.sellers.map((s) => s.pcName).join('、') }}
        </p>
        <MarkdownText v-if="item.description" :text="item.description" />

        <div v-if="item.stock !== 0 && selectedPc" class="item-buy">
          <input
            v-model.number="quantities[item.id]"
            type="number"
            min="1"
            :max="item.stock ?? undefined"
            placeholder="1"
            class="qty-input"
          />
          <span class="qty-unit">個</span>
          <button class="buy-btn" :disabled="!canBuy(item) || buying" @click="requestBuy(item)">
            購入
          </button>
        </div>
      </div>

      <p v-if="shopItems.length === 0" class="notice">商品がありません</p>
    </div>

    <section v-if="selectedPc" class="history">
      <h2 class="history-title">{{ selectedPc.name }}の取引履歴</h2>
      <div v-for="p in purchases ?? []" :key="`${p.kind}-${p.id}`" class="history-row">
        <span class="history-date">{{ formatDateTime(p.created_at) }}</span>
        <span class="history-name">
          <span class="history-kind" :class="p.kind">{{ p.kind === 'sale' ? '売上' : '購入' }}</span>
          [{{ p.shop }}] {{ p.item_name }} ×{{ p.quantity }}
        </span>
        <span class="history-total" :class="p.kind">
          {{ p.amount >= 0 ? '+' : '-' }}{{ formatMoney(Math.abs(p.amount)) }}
        </span>
      </div>
      <p v-if="(purchases ?? []).length === 0" class="notice">取引履歴はありません</p>
    </section>

    <ConfirmDialog
      v-model="showConfirm"
      title="購入の確認"
      confirm-label="購入する"
      :danger="false"
      :message="confirmMessage"
      @confirm="buy"
    />
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 72px 16px 48px;
  box-sizing: border-box;
}

.page-title {
  font-size: 1.3rem;
  border-left: 5px solid var(--color-accent);
  padding-left: 10px;
  margin-bottom: 16px;
}

.notice {
  font-size: 0.85rem;
  opacity: 0.6;
}

.tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.tab-btn {
  flex: 1;
  border: 2px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 8px 12px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  font-family: inherit;
}

.tab-btn.active {
  background: var(--color-accent, #ffd400);
  color: #000;
}

.success-text,
.error-text {
  font-size: 0.85rem;
  margin: 0 0 10px;
  font-weight: bold;
}

.error-text {
  color: #c00;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  border: 2px solid var(--color-text, #000);
  box-shadow: 4px 4px 0 var(--color-text, #000);
  background: var(--color-bg, #fff);
  padding: 12px 14px;
}

.item.soldout {
  opacity: 0.5;
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}

.item-name {
  font-size: 1rem;
  font-weight: bold;
  word-break: break-word;
}

.item-price {
  flex-shrink: 0;
  font-size: 1rem;
  font-weight: bold;
  background: #000;
  color: var(--color-accent, #ffd400);
  padding: 1px 8px;
}

.item-stock {
  margin: 4px 0 6px;
  font-size: 0.75rem;
  opacity: 0.7;
}

.item-buy {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 10px;
}

.qty-input {
  width: 64px;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 6px;
  font-size: 0.9rem;
  text-align: right;
}

.qty-unit {
  font-size: 0.8rem;
}

.buy-btn {
  border: 2px solid #000;
  background: var(--color-accent, #ffd400);
  color: #000;
  padding: 6px 18px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  font-family: inherit;
}

.buy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history {
  margin-top: 32px;
}

.history-title {
  font-size: 0.95rem;
  margin: 0 0 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--color-text, #000);
}

.history-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-text, #000);
  font-size: 0.8rem;
}

.history-date {
  font-size: 0.7rem;
  opacity: 0.6;
}

.history-name {
  word-break: break-word;
}

.history-total {
  font-weight: bold;
  white-space: nowrap;
}

.history-total.sale {
  color: #080;
}

.history-kind {
  display: inline-block;
  margin-right: 4px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: bold;
  border: 1px solid #000;
}

.history-kind.sale {
  background: var(--color-accent, #ffd400);
  color: #000;
}

.item-sellers {
  margin: 0 0 6px;
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
