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

// 割引の在庫が残っている間は割引販売(割引価格・割引の在庫)、なくなったら通常販売
const onDiscount = (item) => item.discount_price !== null && item.discount_stock > 0
const priceOf = (item) => (onDiscount(item) ? item.discount_price : item.price)
// 買える残り個数(null は無制限)。割引中は割引の残り個数まで
const remainingOf = (item) => (onDiscount(item) ? item.discount_stock : item.stock)
const soldOut = (item) => remainingOf(item) === 0
const sellersOf = (item) => (onDiscount(item) ? item.discountSellers : item.sellers) ?? []

// --- 探す: 名前検索・並び替え・売り切れを隠す ---
const searchName = ref('')
const sortKey = ref('new')
const SORTS = [
  { value: 'new', label: '新着順' },
  { value: 'price-asc', label: '安い順' },
  { value: 'price-desc', label: '高い順' },
]
const hideSoldOut = ref(false)

const shopItems = computed(() => {
  let list = (items.value ?? []).filter((item) => item.shop === activeShop.value)
  const q = searchName.value.trim()
  if (q) list = list.filter((item) => item.name.includes(q))
  if (hideSoldOut.value) list = list.filter((item) => !soldOut(item))
  if (sortKey.value === 'price-asc') list = [...list].sort((a, b) => priceOf(a) - priceOf(b))
  if (sortKey.value === 'price-desc') list = [...list].sort((a, b) => priceOf(b) - priceOf(a))
  return list
})
const shopTotal = computed(() => (items.value ?? []).filter((item) => item.shop === activeShop.value).length)

// --- 買う: 個数・合計・購入後の残高・買えない理由 ---
const quantities = ref({})
const qtyOf = (item) => quantities.value[item.id] ?? 1
const setQty = (item, n) => {
  const max = remainingOf(item) ?? Infinity
  quantities.value[item.id] = Math.min(Math.max(1, n), max)
}
const totalOf = (item) => priceOf(item) * (Number.isInteger(qtyOf(item)) ? qtyOf(item) : 0)
const isLedger = computed(() => selectedPc.value?.money_mode === 'ledger')

// 買えないときの理由(買えるなら空文字)
const blockReason = (item) => {
  if (!selectedPc.value) return 'PCを選んでください'
  const qty = qtyOf(item)
  if (!Number.isInteger(qty) || qty < 1) return '個数は1以上で入れてください'
  const remaining = remainingOf(item)
  if (remaining !== null && remaining < qty) {
    return onDiscount(item) ? `割引の残りは${remaining}個です` : `在庫は${remaining}個です`
  }
  // 出納帳のPCは残高を確かめない
  if (!isLedger.value && selectedPc.value.money < totalOf(item)) {
    return `所持金が${formatMoney(totalOf(item) - selectedPc.value.money)}足りません`
  }
  return ''
}

const pending = ref(null)
const showConfirm = ref(false)
const buying = ref(false)
const { show } = useToast()
const { showWithUndo } = useUndo()

const requestBuy = (item) => {
  pending.value = { item, quantity: qtyOf(item), discount: onDiscount(item), price: priceOf(item) }
  showConfirm.value = true
}

const confirmMessage = computed(() => {
  if (!pending.value) return ''
  const { item, quantity, discount, price } = pending.value
  const total = price * quantity
  const after = isLedger.value ? '' : `\n購入後の所持金: ${formatMoney(selectedPc.value.money - total)}`
  return `${selectedPc.value?.name}で「${item.name}」を${quantity}個、${discount ? '割引価格で' : ''}合計${formatMoney(total)}で購入しますか?${after}`
})

const refreshAll = () => Promise.all([refreshItemsRaw(), refreshMyPcs(), refreshPurchases()])

const buy = async () => {
  if (!pending.value || !selectedPc.value) return
  const { item, quantity, discount } = pending.value
  buying.value = true
  try {
    const res = await $fetch('/api/shop/purchase', {
      method: 'POST',
      body: { pcId: selectedPc.value.id, itemId: item.id, quantity, discount },
    })
    // 10秒間「取り消す」を押せる(買い間違えたとき用)
    showWithUndo(`「${item.name}」を${quantity}個購入しました`, 'purchase', res.purchaseId, refreshAll)
    quantities.value[item.id] = 1
  } catch (e) {
    show(e?.data?.statusMessage ?? '購入に失敗しました', 'error')
  } finally {
    buying.value = false
    pending.value = null
    await refreshAll()
  }
}

// --- 取引履歴: 最初は10件だけ出す ---
const HISTORY_STEP = 10
const historyLimit = ref(HISTORY_STEP)
watch(selectedPcId, () => {
  historyLimit.value = HISTORY_STEP
})
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

    <!-- 探す -->
    <div class="finder">
      <input v-model="searchName" type="search" placeholder="商品名で検索" class="search-input" />
      <div class="finder-row">
        <select v-model="sortKey" class="sort-select" aria-label="並び順">
          <option v-for="o in SORTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <label class="soldout-filter">
          <input v-model="hideSoldOut" type="checkbox" />
          売り切れを隠す
        </label>
      </div>
    </div>

    <!-- 名称と値段を並べ、開くと詳細と購入欄が出る -->
    <p v-if="shopItems.length === 0" class="empty">
      {{ shopTotal === 0 ? '商品がありません' : '条件に合う商品がありません' }}
    </p>
    <AccordionList :items="shopItems" class="item-list">
      <template #title="{ item }">
        <span class="item-head" :class="{ soldout: soldOut(item) }">
          <span class="item-title">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-sub">
              <span v-if="soldOut(item)" class="soldout-tag">売り切れ</span>
              <span v-else-if="onDiscount(item)" class="discount-tag">割引 残り{{ item.discount_stock }}</span>
              <span v-else-if="item.stock !== null" class="stock-tag" :class="{ few: item.stock <= 3 }">残り{{ item.stock }}</span>
            </span>
          </span>
          <span class="item-prices">
            <s v-if="onDiscount(item)" class="regular-price">{{ formatMoney(item.price) }}</s>
            <span class="item-price" :class="{ discount: onDiscount(item) }">{{ formatMoney(priceOf(item)) }}</span>
          </span>
        </span>
      </template>
      <template #detail="{ item }">
        <div class="item-detail">
          <p v-if="onDiscount(item)" class="discount-note">
            割引販売中: 残り{{ item.discount_stock }}個(なくなると通常価格{{ formatMoney(item.price) }}に戻ります)
          </p>
          <p v-else class="item-stock">
            <template v-if="item.stock === null">在庫: 無制限</template>
            <template v-else-if="item.stock === 0">売り切れ</template>
            <template v-else>在庫: {{ item.stock }}</template>
          </p>
          <p v-if="sellersOf(item).length" class="item-sellers">
            販売者: {{ sellersOf(item).map((s) => s.pcName).join('、') }}
          </p>
          <MarkdownText v-if="item.description" :text="item.description" />

          <div v-if="!soldOut(item) && selectedPc" class="buy-box">
            <div class="buy-row">
              <div class="qty-stepper">
                <button class="qty-btn" :disabled="qtyOf(item) <= 1" aria-label="1個減らす" @click="setQty(item, qtyOf(item) - 1)">−</button>
                <input
                  v-model.number="quantities[item.id]"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  :max="remainingOf(item) ?? undefined"
                  placeholder="1"
                  class="qty-input"
                  aria-label="個数"
                />
                <button
                  class="qty-btn"
                  :disabled="remainingOf(item) !== null && qtyOf(item) >= remainingOf(item)"
                  aria-label="1個増やす"
                  @click="setQty(item, qtyOf(item) + 1)"
                >＋</button>
              </div>
              <button class="buy-btn" :disabled="!!blockReason(item) || buying" @click="requestBuy(item)">
                購入
              </button>
            </div>
            <p class="buy-summary">
              合計 <strong>{{ formatMoney(totalOf(item)) }}</strong>
              <template v-if="!isLedger"> / 購入後 {{ formatMoney(selectedPc.money - totalOf(item)) }}</template>
            </p>
            <p v-if="blockReason(item)" class="buy-reason">{{ blockReason(item) }}</p>
          </div>
        </div>
      </template>
    </AccordionList>

    <section v-if="selectedPc" class="history">
      <h2 class="history-title">{{ selectedPc.name }}の取引履歴</h2>
      <div v-for="p in (purchases ?? []).slice(0, historyLimit)" :key="`${p.kind}-${p.id}`" class="history-row">
        <span class="history-date">{{ formatDateTime(p.created_at) }}</span>
        <span class="history-name">
          <span class="history-kind" :class="p.kind">{{ p.kind === 'sale' ? '売上' : '購入' }}</span>
          [{{ p.shop }}] {{ p.item_name }} ×{{ p.quantity }}
        </span>
        <span class="history-total" :class="p.kind">
          {{ p.amount >= 0 ? '+' : '-' }}{{ formatMoney(Math.abs(p.amount)) }}
        </span>
      </div>
      <button
        v-if="(purchases ?? []).length > historyLimit"
        class="more-btn"
        @click="historyLimit += HISTORY_STEP"
      >
        もっと見る
      </button>
      <p v-if="(purchases ?? []).length === 0" class="empty">取引履歴はありません</p>
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









.discount-note {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: bold;
  color: var(--color-error, #c62828);
}

.item-detail {
  padding: 10px 14px 14px;
}

.item-stock {
  margin: 0 0 6px;
  font-size: 0.75rem;
  opacity: 0.7;
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

/* ---------- 探す ---------- */
.finder {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  padding: 8px 10px;
}

.finder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sort-select {
  border: 1px solid var(--color-text, #000);
  padding: 6px 10px;
  font-size: 0.9rem !important;
}

.soldout-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
}

/* ---------- 商品一覧の見出し ---------- */
.item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-head.soldout {
  opacity: 0.5;
}

.item-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.item-name {
  font-size: 1rem;
  font-weight: bold;
  word-break: break-word;
}

.item-sub {
  display: flex;
  gap: 6px;
  font-weight: normal;
}

.item-sub:empty {
  display: none;
}

.soldout-tag,
.discount-tag,
.stock-tag {
  font-size: 0.68rem;
  line-height: 1.5;
  padding: 0 6px;
  border: 1px solid currentColor;
}

.discount-tag {
  border-color: var(--color-error, #c62828);
  background: var(--color-error, #c62828);
  color: #fff;
  font-weight: bold;
}

.stock-tag {
  opacity: 0.7;
}

.stock-tag.few {
  opacity: 1;
  font-weight: bold;
  color: var(--color-error, #c62828);
}

.item-prices {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.regular-price {
  font-size: 0.72rem;
  opacity: 0.6;
}

.item-price {
  font-size: 0.95rem;
  font-weight: bold;
  background: #000;
  color: var(--color-accent, #ffd400);
  padding: 1px 8px;
}

.item-price.discount {
  color: #fff;
  background: var(--color-error, #c62828);
}

/* ---------- 買う ---------- */
.buy-box {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-line, rgba(0, 0, 0, 0.14));
}

.buy-row {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
}

.qty-stepper {
  display: flex;
  border: 1px solid var(--color-text, #000);
}

.qty-btn {
  width: 40px;
  border: none;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
}

.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.qty-input {
  width: 52px;
  box-sizing: border-box;
  border: none;
  border-left: 1px solid var(--color-text, #000);
  border-right: 1px solid var(--color-text, #000);
  padding: 6px;
  text-align: center;
}

.buy-summary {
  margin: 8px 0 0;
  font-size: 0.82rem;
  text-align: right;
}

.buy-reason {
  margin: 4px 0 0;
  font-size: 0.78rem;
  font-weight: bold;
  text-align: right;
  color: var(--color-error, #c62828);
}

.more-btn {
  display: block;
  width: 100%;
  margin-top: 8px;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  padding: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
