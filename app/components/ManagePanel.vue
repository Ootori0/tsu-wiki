<script setup>
// 管理者画面とKP画面で共通の管理パネル。表示するタブは tabs で指定する
const props = defineProps({
  title: { type: String, required: true },
  tabs: { type: Array, required: true },
})

const { show } = useToast()
const { resize, fitAll } = useAutoResize()

// 操作を実行して結果をトーストで知らせる(失敗時はAPIのメッセージを出す)
const run = async (action, successMessage, errorMessage = '操作に失敗しました') => {
  try {
    await action()
    if (successMessage) show(successMessage)
    return true
  } catch (e) {
    show(e?.data?.statusMessage ?? errorMessage, 'error')
    return false
  }
}

const tabs = computed(() => props.tabs)
const activeTab = ref(props.tabs[0])
const hasTab = (name) => props.tabs.includes(name)

// --- アカウント管理 ---
// アカウント・権限は admin 専用なので、そのタブがあるときだけ読み込む
const { data: users, refresh: refreshUsers } = await useFetch('/api/admin/users', {
  immediate: hasTab('アカウント管理'),
})
const { data: allPermissions, refresh: refreshPermissions } = await useFetch('/api/admin/permissions', {
  immediate: hasTab('アカウント管理') || hasTab('権限管理'),
})

// 記入・編集はポップアップで行う(編集中の id が null なら新規作成)
const userDialogOpen = ref(false)
const editingUserId = ref(null)
const userForm = ref({ name: '', password: '', permissions: [] })
const savingUser = ref(false)

const openUserCreate = () => {
  editingUserId.value = null
  userForm.value = { name: '', password: '', permissions: [] }
  userDialogOpen.value = true
}

const openUserEdit = (u) => {
  editingUserId.value = u.id
  userForm.value = { name: u.name, password: '', permissions: [...u.permissions] }
  userDialogOpen.value = true
}

const toggleUserFormPerm = (permName) => {
  // admin権限は管理者画面から付け外し不可
  if (permName === 'admin') return
  const perms = userForm.value.permissions
  const idx = perms.indexOf(permName)
  if (idx === -1) perms.push(permName)
  else perms.splice(idx, 1)
}

const saveUser = async () => {
  const id = editingUserId.value
  if (!id && (!userForm.value.name || !userForm.value.password)) return
  savingUser.value = true
  const ok = await run(async () => {
    if (id) {
      await $fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: { permissions: userForm.value.permissions },
      })
    } else {
      await $fetch('/api/admin/users', { method: 'POST', body: userForm.value })
    }
    await refreshUsers()
  }, id ? `${userForm.value.name}の権限を更新しました` : 'アカウントを作成しました')
  savingUser.value = false
  if (ok) userDialogOpen.value = false
}

const deleteUser = async (id) => {
  if (!confirm('このアカウントを削除しますか?')) return
  const ok = await run(async () => {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await refreshUsers()
  }, 'アカウントを削除しました')
  if (ok) userDialogOpen.value = false
}

// --- 権限・タグ・所属の追加(名前だけのポップアップ) ---
const NAME_KINDS = {
  permission: { title: '権限の追加', label: '権限名' },
  tag: { title: 'タグの追加', label: 'タグ名' },
  affiliation: { title: '所属の追加', label: '所属名' },
}
const nameDialogOpen = ref(false)
const nameKind = ref('tag')
const nameValue = ref('')

const openNameCreate = (kind) => {
  nameKind.value = kind
  nameValue.value = ''
  nameDialogOpen.value = true
}

const saveName = async () => {
  if (!nameValue.value) return
  const create = { permission: createPermission, tag: createTag, affiliation: createAffiliation }[nameKind.value]
  if (await create(nameValue.value)) nameDialogOpen.value = false
}

// --- 権限管理 ---
const createPermission = async (name) => {
  return run(async () => {
    await $fetch('/api/admin/permissions', {
      method: 'POST',
      body: { name },
    })
    await refreshPermissions()
  }, '権限を追加しました')
}

const deletePermission = async (id) => {
  if (!confirm('この権限を削除しますか?')) return
  await run(async () => {
    await $fetch(`/api/admin/permissions/${id}`, { method: 'DELETE' })
    await refreshPermissions()
  }, '権限を削除しました')
}

// --- タグ管理 ---
const { data: tags, refresh: refreshTags } = await useFetch('/api/tags')
const createTag = async (name) => {
  return run(async () => {
    await $fetch('/api/tags', {
      method: 'POST',
      body: { name },
    })
    await refreshTags()
  }, 'タグを追加しました')
}

const deleteTag = async (id) => {
  if (!confirm('このタグを削除しますか?')) return
  await run(async () => {
    await $fetch(`/api/tags/${id}`, { method: 'DELETE' })
    await refreshTags()
  }, 'タグを削除しました')
}

// --- 所属管理 ---
const { data: affiliations, refresh: refreshAffiliationsRaw } = await useFetch('/api/affiliations')

const refreshAffiliations = async () => {
  clearNuxtData('affiliations-list')
  await refreshAffiliationsRaw()
}

const createAffiliation = async (name) => {
  return run(async () => {
    await $fetch('/api/affiliations', {
      method: 'POST',
      body: { name },
    })
    await refreshAffiliations()
  }, '所属を追加しました')
}

const deleteAffiliation = async (id) => {
  if (!confirm('この所属を削除しますか?')) return
  await run(async () => {
    await $fetch(`/api/affiliations/${id}`, { method: 'DELETE' })
    await refreshAffiliations()
  }, '所属を削除しました')
}

// --- 商品管理 ---
const shops = ['魔法店', '武器屋']
const { data: shopItems, refresh: refreshShopItems } = await useFetch('/api/shop/items', {
  key: 'admin-shop-items',
})
const { data: allPurchases, refresh: refreshAllPurchases } = await useFetch('/api/shop/purchases', {
  key: 'admin-purchases',
})

const { data: allPcs } = await useFetch('/api/pcs', { key: 'admin-all-pcs' })

const emptyItemForm = () => ({ shop: '魔法店', name: '', price: 0, stock: '', description: '', sellers: [] })

const addSeller = (form) => {
  form.sellers.push({ pcId: null, amount: 0 })
}

const removeSeller = (form, index) => {
  form.sellers.splice(index, 1)
}
// 記入・編集はポップアップで行う(編集中の id が null なら新規作成)
const itemDialogOpen = ref(false)
const editingItemId = ref(null)
const itemForm = ref(emptyItemForm())
const itemError = ref('')

const afterItemChange = async () => {
  // 店ページの商品キャッシュも破棄する
  clearNuxtData('shop-items')
  await refreshShopItems()
}

const openItemCreate = () => {
  itemError.value = ''
  editingItemId.value = null
  itemForm.value = emptyItemForm()
  itemDialogOpen.value = true
}

const openItemEdit = (item) => {
  itemError.value = ''
  editingItemId.value = item.id
  itemForm.value = {
    shop: item.shop,
    name: item.name,
    price: item.price,
    stock: item.stock ?? '',
    description: item.description ?? '',
    sellers: (item.sellers ?? []).map((s) => ({ pcId: s.pcId, amount: s.amount })),
  }
  itemDialogOpen.value = true
  fitAll()
}

const saveItem = async () => {
  if (!itemForm.value.name) return
  const id = editingItemId.value
  itemError.value = ''
  try {
    if (id) await $fetch(`/api/shop/items/${id}`, { method: 'PUT', body: itemForm.value })
    else await $fetch('/api/shop/items', { method: 'POST', body: itemForm.value })
    itemDialogOpen.value = false
    await afterItemChange()
    show(id ? '商品を保存しました' : '商品を追加しました')
  } catch (e) {
    itemError.value = e?.data?.statusMessage ?? '保存に失敗しました'
  }
}

const deleteItem = async (id) => {
  if (!confirm('この商品を削除しますか?(購入履歴は残ります)')) return
  const ok = await run(async () => {
    await $fetch(`/api/shop/items/${id}`, { method: 'DELETE' })
    await afterItemChange()
  }, '商品を削除しました')
  if (ok) itemDialogOpen.value = false
}

// --- 所持金履歴 ---
const logPcId = ref(null)
const { data: moneyLogs, execute: loadMoneyLogs, pending: loadingLogs } = await useFetch('/api/admin/money-logs', {
  key: 'admin-money-logs',
  query: computed(() => (logPcId.value ? { pcId: logPcId.value } : {})),
  immediate: false,
  watch: false,
})
// タブを開いたとき・PCを切り替えたときに読み込む
watch([activeTab, logPcId], () => {
  if (activeTab.value === '所持金履歴') loadMoneyLogs()
})

// --- カジノ設定 ---
const { data: chinchiroData, refresh: refreshChinchiro } = await useFetch('/api/casino/chinchiro/payouts', {
  key: 'admin-chinchiro-payouts',
})
const payoutForm = ref({})
const dealerForm = ref({ pcId: null, share: 100 })
watch(chinchiroData, (d) => {
  payoutForm.value = { ...(d?.payouts ?? {}) }
  dealerForm.value = { pcId: d?.dealer?.pcId ?? null, share: d?.dealer?.share ?? 100 }
}, { immediate: true })
const savePayouts = async () => {
  await run(async () => {
    await $fetch('/api/casino/chinchiro/payouts', {
      method: 'PUT',
      body: {
        payouts: payoutForm.value,
        dealerPcId: dealerForm.value.pcId,
        dealerShare: dealerForm.value.share,
      },
    })
    clearNuxtData('chinchiro-payouts')
    await refreshChinchiro()
  }, 'カジノ設定を保存しました', '保存に失敗しました')
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ title }}</h1>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- アカウント管理 -->
    <div v-if="activeTab === 'アカウント管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">アカウント一覧</h2>
        <AccordionList :items="users ?? []" title-key="name">
          <template #detail="{ item }">
            <div class="detail">
              <p class="item-meta">権限: {{ item.permissions.length ? item.permissions.join('、') : 'なし' }}</p>
              <button class="edit-btn" @click="openUserEdit(item)">編集</button>
            </div>
          </template>
        </AccordionList>
        <button class="add-btn" @click="openUserCreate">＋ アカウントを作成</button>
      </div>
    </div>

    <!-- 権限管理 -->
    <div v-if="activeTab === '権限管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">権限一覧</h2>
        <div v-for="perm in allPermissions ?? []" :key="perm.id" class="list-row">
          <span>{{ perm.name }}</span>
          <button
            class="delete-btn"
            :disabled="perm.name === 'admin'"
            @click="deletePermission(perm.id)"
          >
            削除
          </button>
        </div>
        <button class="add-btn" @click="openNameCreate('permission')">＋ 権限を追加</button>
      </div>
    </div>

    <!-- タグ管理 -->
    <div v-if="activeTab === 'タグ管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">タグ一覧</h2>
        <div v-for="tag in tags ?? []" :key="tag.id" class="list-row">
          <span>{{ tag.name }}</span>
          <button class="delete-btn" @click="deleteTag(tag.id)">削除</button>
        </div>
        <button class="add-btn" @click="openNameCreate('tag')">＋ タグを追加</button>
      </div>
    </div>

    <!-- 所属管理 -->
    <div v-if="activeTab === '所属管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">所属一覧</h2>
        <div v-for="a in affiliations ?? []" :key="a.id" class="list-row">
          <span>{{ a.name }}</span>
          <button class="delete-btn" @click="deleteAffiliation(a.id)">削除</button>
        </div>
        <button class="add-btn" @click="openNameCreate('affiliation')">＋ 所属を追加</button>
      </div>
    </div>

    <!-- 商品管理 -->
    <div v-if="activeTab === '商品管理'" class="tab-content">
      <div v-for="shop in shops" :key="shop" class="box">
        <h2 class="box-title">{{ shop }}の商品</h2>
        <AccordionList :items="(shopItems ?? []).filter((i) => i.shop === shop)" title-key="name">
          <template #detail="{ item }">
            <div class="detail">
              <p class="item-meta">
                {{ formatMoney(item.price) }} / 在庫: {{ item.stock === null ? '無制限' : item.stock }}
              </p>
              <p v-if="item.sellers?.length" class="item-meta">
                販売者: {{ item.sellers.map((s) => `${s.pcName}(${formatMoney(s.amount)})`).join('、') }}
              </p>
              <p v-if="item.description" class="item-meta description">{{ item.description }}</p>
              <button class="edit-btn" @click="openItemEdit(item)">編集</button>
            </div>
          </template>
        </AccordionList>
      </div>
      <button class="add-btn add-item" @click="openItemCreate">＋ 商品を追加</button>

      <div class="box">
        <h2 class="box-title">購入履歴(最新100件)</h2>
        <button class="edit-btn" @click="refreshAllPurchases()">再読み込み</button>
        <div v-for="p in allPurchases ?? []" :key="p.id" class="list-row">
          <span class="item-meta">
            {{ formatDateTime(p.created_at) }}<br />
            {{ p.pc_name ?? '(削除済みPC)' }}: [{{ p.shop }}] {{ p.item_name }} ×{{ p.quantity }}
            <template v-for="po in p.payouts" :key="po.purchase_id + po.pc_name">
              <br />→ {{ po.pc_name ?? '(削除済みPC)' }} +{{ formatMoney(po.amount) }}
            </template>
          </span>
          <span class="user-row-name">{{ formatMoney(p.total) }}</span>
        </div>
      </div>
    </div>

    <!-- 所持金履歴 -->
    <div v-if="activeTab === '所持金履歴'" class="tab-content">
      <div class="box">
        <h2 class="box-title">所持金履歴(最新200件)</h2>
        <div class="inline-form">
          <select v-model="logPcId" class="field-input">
            <option :value="null">すべてのPC</option>
            <option v-for="pc in allPcs ?? []" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
          </select>
          <button class="edit-btn" :disabled="loadingLogs" @click="loadMoneyLogs()">再読み込み</button>
        </div>
        <div v-for="log in moneyLogs ?? []" :key="`${log.kind}-${log.id}`" class="log-row">
          <div class="log-top">
            <span class="item-meta">{{ formatDateTime(log.created_at) }}</span>
            <span class="log-pc">{{ log.pc_name ?? '(削除済みPC)' }}</span>
            <span class="log-amount" :class="{ plus: log.amount > 0, minus: log.amount < 0 }">
              {{ log.amount > 0 ? '+' : '' }}{{ formatMoney(log.amount) }}
            </span>
          </div>
          <div class="item-meta">
            <span class="log-kind">{{ MONEY_LOG_KIND_LABELS[log.kind] }}</span>
            {{ describeMoneyLog(log) }}
            <template v-if="log.user_name">(操作: {{ log.user_name }})</template>
          </div>
        </div>
        <p v-if="!loadingLogs && (moneyLogs ?? []).length === 0" class="empty">履歴はありません</p>
      </div>
    </div>

    <!-- カジノ設定 -->
    <div v-if="activeTab === 'カジノ設定'" class="tab-content">
      <div class="box">
        <h2 class="box-title">ディーラー</h2>
        <p class="item-meta">プレイヤーの負け額の割合分を受け取り、勝ち額の割合分を支払います(所持金はマイナスになり得ます)。</p>
        <label class="field-label">ディーラーPC</label>
        <select v-model="dealerForm.pcId" class="field-input">
          <option :value="null">なし</option>
          <option v-for="pc in allPcs ?? []" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
        </select>
        <label class="field-label">還元割合(%)</label>
        <input v-model.number="dealerForm.share" type="number" min="0" max="100" step="1" class="field-input" />
        <button class="save-btn" @click="savePayouts">保存</button>
      </div>

      <div class="box">
        <h2 class="box-title">チンチロの倍率</h2>
        <p class="item-meta">入力するのは掛金に対する所持金の増減(マイナスは負け)。カジノ画面では1を足した払い戻し倍率で表示されます。小数第2位まで指定できます。</p>
        <table class="payout-table">
          <tr>
            <th>役</th>
            <th>確率</th>
            <th>倍率</th>
          </tr>
          <tr v-for="h in CHINCHIRO_HANDS" :key="h.key">
            <td>{{ h.label }}<br /><span class="item-meta">{{ h.desc }}</span></td>
            <td class="item-meta">{{ (handProbability(h.key) * 100).toFixed(2) }}%</td>
            <td>
              <input v-model.number="payoutForm[h.key]" type="number" step="0.01" class="field-input payout-input" />
              <span class="item-meta payout-display">表示: {{ formatMultiplier(payoutForm[h.key]) }}</span>
            </td>
          </tr>
        </table>
        <p class="item-meta expected">
          期待値: 掛金1に対して {{ expectedReturn(payoutForm) >= 0 ? '+' : '' }}{{ expectedReturn(payoutForm).toFixed(3) }}
          (還元率 {{ ((1 + expectedReturn(payoutForm)) * 100).toFixed(1) }}%)
        </p>
        <button class="save-btn" @click="savePayouts">保存</button>
      </div>
    </div>
    <!-- アカウントの作成・編集 -->
    <FormDialog v-model="userDialogOpen" :title="editingUserId ? 'アカウントの編集' : 'アカウントの作成'">
      <template v-if="editingUserId">
        <label class="field-label">ID</label>
        <p class="dialog-value">{{ userForm.name }}</p>
      </template>
      <template v-else>
        <label class="field-label">ID</label>
        <input v-model="userForm.name" class="field-input" />
        <label class="field-label">パスワード</label>
        <input v-model="userForm.password" type="password" class="field-input" />
      </template>
      <label class="field-label">{{ editingUserId ? '権限' : '初期権限' }}</label>
      <div class="chip-list">
        <button
          v-for="perm in allPermissions ?? []"
          :key="perm.id"
          class="chip"
          :class="{ active: userForm.permissions.includes(perm.name) }"
          :disabled="perm.name === 'admin'"
          @click="toggleUserFormPerm(perm.name)"
        >
          {{ perm.name }}
        </button>
      </div>

      <template #actions>
        <button
          class="save-btn dlg"
          :disabled="savingUser || (!editingUserId && (!userForm.name || !userForm.password))"
          @click="saveUser"
        >
          保存
        </button>
        <button class="save-btn dlg cancel" @click="userDialogOpen = false">キャンセル</button>
        <button
          v-if="editingUserId"
          class="delete-btn dlg push-right"
          :disabled="userForm.permissions.includes('admin')"
          @click="deleteUser(editingUserId)"
        >
          削除
        </button>
      </template>
    </FormDialog>

    <!-- 権限・タグ・所属の追加 -->
    <FormDialog v-model="nameDialogOpen" :title="NAME_KINDS[nameKind].title">
      <label class="field-label">{{ NAME_KINDS[nameKind].label }}</label>
      <input v-model="nameValue" class="field-input" @keydown.enter="saveName" />

      <template #actions>
        <button class="save-btn dlg" :disabled="!nameValue" @click="saveName">追加</button>
        <button class="save-btn dlg cancel" @click="nameDialogOpen = false">キャンセル</button>
      </template>
    </FormDialog>

    <!-- 商品の追加・編集 -->
    <FormDialog v-model="itemDialogOpen" :title="editingItemId ? '商品の編集' : '商品の追加'">
      <label class="field-label">店</label>
      <select v-model="itemForm.shop" class="field-input">
        <option v-for="s in shops" :key="s" :value="s">{{ s }}</option>
      </select>
      <label class="field-label">商品名</label>
      <input v-model="itemForm.name" class="field-input" />
      <label class="field-label">価格({{ MONEY_UNIT }})</label>
      <input v-model.number="itemForm.price" type="number" min="0" class="field-input" />
      <label class="field-label">在庫(空欄=無制限)</label>
      <input v-model="itemForm.stock" type="number" min="0" class="field-input" />
      <label class="field-label">説明</label>
      <textarea v-model="itemForm.description" class="field-input auto-wrap" rows="3" @input="resize" />
      <label class="field-label">販売者(1個売れるごとに入る金額)</label>
      <div v-for="(seller, i) in itemForm.sellers" :key="i" class="seller-row">
        <select v-model.number="seller.pcId" class="field-input">
          <option :value="null" disabled>PCを選択</option>
          <option v-for="pc in allPcs ?? []" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
        </select>
        <input v-model.number="seller.amount" type="number" min="0" class="field-input seller-amount" />
        <button class="delete-btn" @click="removeSeller(itemForm, i)">×</button>
      </div>
      <button class="edit-btn add-seller" @click="addSeller(itemForm)">＋ 販売者を追加</button>
      <p v-if="itemError" class="error-text">{{ itemError }}</p>

      <template #actions>
        <button class="save-btn dlg" :disabled="!itemForm.name" @click="saveItem">保存</button>
        <button class="save-btn dlg cancel" @click="itemDialogOpen = false">キャンセル</button>
        <button v-if="editingItemId" class="delete-btn dlg push-right" @click="deleteItem(editingItemId)">削除</button>
      </template>
    </FormDialog>
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

.tab-bar {
  display: flex;
  gap: 6px;
  margin: 0 -16px 16px;
  padding: 0 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

/* タブが多いので折り返さず横スクロールにする */
.tab-bar::-webkit-scrollbar {
  display: none;
}

/* マウス操作の端末では横スクロールできないので折り返して全タブを表示する */
@media (hover: hover) and (pointer: fine) {
  .tab-bar {
    flex-wrap: wrap;
    overflow-x: visible;
    margin: 0 0 16px;
    padding: 0;
  }
}

.tab-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.tab-btn.active {
  background: var(--color-accent, #ffd400);
  font-weight: bold;
}

.box {
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  padding: 14px;
  margin-bottom: 16px;
}

.box-title {
  font-size: 1rem;
  margin: 0 0 10px;
  color: var(--color-text, #000);
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: bold;
  margin-top: 8px;
  color: var(--color-text, #000);
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 8px;
  font-size: 16px;
  margin-top: 4px;
}

.inline-form {
  display: flex;
  gap: 8px;
}

.inline-form .save-btn {
  margin-top: 0;
}

.inline-form .field-input {
  margin-top: 0;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.chip {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 4px 10px;
  font-size: 0.78rem;
  border-radius: 12px;
  cursor: pointer;
}

.chip.active {
  background: var(--color-accent, #ffd400);
  font-weight: bold;
}

.save-btn {
  margin-top: 12px;
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  padding: 8px 16px;
  font-size: 0.85rem;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.delete-btn:disabled,
.chip:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-row {
  border-top: 1px dashed var(--color-text, #000);
  padding-top: 10px;
  margin-top: 10px;
}

.user-row:first-child {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.user-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.user-row-name {
  font-weight: bold;
}

.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--color-text, #000);
  padding: 8px 0;
}

.list-row:first-child {
  border-top: none;
}

.error-text {
  color: #c00;
  font-size: 0.8rem;
  margin: 6px 0 0;
}

.save-btn.cancel {
  background: var(--color-bg, #fff);
}

.edit-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  padding: 3px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.seller-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.seller-row .field-input {
  flex: 1;
}

.seller-row .seller-amount {
  flex: 0 0 90px;
}

.add-seller {
  display: block;
  margin-top: 8px;
}

.payout-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 0.85rem;
}

.payout-table th,
.payout-table td {
  padding: 4px;
  border-bottom: 1px dashed var(--color-text, #000);
  text-align: left;
  vertical-align: middle;
}

.log-row {
  border-top: 1px dashed var(--color-text, #000);
  padding: 8px 0;
}

.log-row:first-of-type {
  margin-top: 10px;
}

.log-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.log-pc {
  flex: 1;
  font-weight: bold;
  font-size: 0.9rem;
}

.log-amount {
  font-weight: bold;
  white-space: nowrap;
}

.log-amount.plus {
  color: var(--color-plus);
}

.log-amount.minus {
  color: var(--color-error);
}

.log-kind {
  display: inline-block;
  margin-right: 4px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: bold;
  border: 1px solid #000;
  background: var(--color-accent);
}

.payout-display {
  display: block;
  margin-top: 2px;
  white-space: nowrap;
}

.payout-input {
  width: 90px;
  margin-top: 0;
}

.expected {
  margin-top: 10px;
  font-weight: bold;
}

.item-meta {
  margin: 0;
  font-size: 0.78rem;
  opacity: 0.8;
}

.delete-btn {
  border: 1px solid #c00;
  background: var(--color-bg, #fff);
  color: #c00;
  padding: 3px 10px;
  font-size: 0.78rem;
  cursor: pointer;
}

/* アコーディオンの中身(表示専用) */
.detail {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.detail .item-meta {
  margin: 0;
}

.description {
  white-space: pre-line;
}

.add-btn {
  width: 100%;
  box-sizing: border-box;
  margin-top: 12px;
  border: 2px dashed var(--color-text, #000);
  background: var(--color-bg, #fff);
  padding: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
}

.add-btn.add-item {
  margin: 0 0 16px;
}

/* ポップアップ内 */
.dialog-value {
  margin: 0;
  font-weight: bold;
}

.push-right {
  margin-left: auto;
}

.save-btn.dlg {
  margin-top: 0;
}

.delete-btn.dlg {
  padding: 8px 16px;
  font-size: 0.85rem;
}

.auto-wrap {
  resize: none;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>