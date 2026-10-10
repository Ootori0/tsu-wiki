<script setup>
definePageMeta({ middleware: 'admin' })

const tabs = ['アカウント管理', '権限管理', 'タグ管理', '所属管理', '商品管理']
const activeTab = ref('アカウント管理')

// --- アカウント管理 ---
const { data: users, refresh: refreshUsers } = await useFetch('/api/admin/users')
const { data: allPermissions, refresh: refreshPermissions } = await useFetch('/api/admin/permissions')

const newUser = ref({ name: '', password: '', permissions: [] })
const creatingUser = ref(false)

const createUser = async () => {
  if (!newUser.value.name || !newUser.value.password) return
  creatingUser.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: newUser.value,
    })
    newUser.value = { name: '', password: '', permissions: [] }
    await refreshUsers()
  } finally {
    creatingUser.value = false
  }
}

const deleteUser = async (id) => {
  if (!confirm('このアカウントを削除しますか?')) return
  await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
  await refreshUsers()
}

const togglePermission = async (targetUser, permName) => {
  // admin権限は管理者画面から付け外し不可
  if (permName === 'admin') return
  const perms = [...targetUser.permissions]
  const idx = perms.indexOf(permName)
  if (idx === -1) {
    perms.push(permName)
  } else {
    perms.splice(idx, 1)
  }
  await $fetch(`/api/admin/users/${targetUser.id}`, {
    method: 'PUT',
    body: { permissions: perms },
  })
  await refreshUsers()
}

// --- 権限管理 ---
const newPermission = ref('')

const createPermission = async () => {
  if (!newPermission.value) return
  await $fetch('/api/admin/permissions', {
    method: 'POST',
    body: { name: newPermission.value },
  })
  newPermission.value = ''
  await refreshPermissions()
}

const deletePermission = async (id) => {
  if (!confirm('この権限を削除しますか?')) return
  await $fetch(`/api/admin/permissions/${id}`, { method: 'DELETE' })
  await refreshPermissions()
}

// --- タグ管理 ---
const { data: tags, refresh: refreshTags } = await useFetch('/api/tags')
const newTag = ref('')

const createTag = async () => {
  if (!newTag.value) return
  await $fetch('/api/tags', {
    method: 'POST',
    body: { name: newTag.value },
  })
  newTag.value = ''
  await refreshTags()
}

const deleteTag = async (id) => {
  if (!confirm('このタグを削除しますか?')) return
  await $fetch(`/api/tags/${id}`, { method: 'DELETE' })
  await refreshTags()
}

// --- 所属管理 ---
const { data: affiliations, refresh: refreshAffiliationsRaw } = await useFetch('/api/affiliations')
const newAffiliation = ref('')

const refreshAffiliations = async () => {
  clearNuxtData('affiliations-list')
  await refreshAffiliationsRaw()
}

const createAffiliation = async () => {
  if (!newAffiliation.value) return
  await $fetch('/api/affiliations', {
    method: 'POST',
    body: { name: newAffiliation.value },
  })
  newAffiliation.value = ''
  await refreshAffiliations()
}

const deleteAffiliation = async (id) => {
  if (!confirm('この所属を削除しますか?')) return
  await $fetch(`/api/affiliations/${id}`, { method: 'DELETE' })
  await refreshAffiliations()
}

// --- 商品管理 ---
const shops = ['魔法店', '武器屋']
const { data: shopItems, refresh: refreshShopItems } = await useFetch('/api/shop/items', {
  key: 'admin-shop-items',
})
const { data: allPurchases, refresh: refreshAllPurchases } = await useFetch('/api/shop/purchases', {
  key: 'admin-purchases',
})

const emptyItemForm = () => ({ shop: '魔法店', name: '', price: 0, stock: '', description: '' })
const newItem = ref(emptyItemForm())
const editingItemId = ref(null)
const editItem = ref(emptyItemForm())
const itemError = ref('')

const afterItemChange = async () => {
  // 店ページの商品キャッシュも破棄する
  clearNuxtData('shop-items')
  await refreshShopItems()
}

const createItem = async () => {
  if (!newItem.value.name) return
  itemError.value = ''
  try {
    await $fetch('/api/shop/items', { method: 'POST', body: newItem.value })
    newItem.value = emptyItemForm()
    await afterItemChange()
  } catch (e) {
    itemError.value = e?.data?.statusMessage ?? '追加に失敗しました'
  }
}

const startEditItem = (item) => {
  itemError.value = ''
  editingItemId.value = item.id
  editItem.value = {
    shop: item.shop,
    name: item.name,
    price: item.price,
    stock: item.stock ?? '',
    description: item.description ?? '',
  }
}

const saveItem = async (id) => {
  itemError.value = ''
  try {
    await $fetch(`/api/shop/items/${id}`, { method: 'PUT', body: editItem.value })
    editingItemId.value = null
    await afterItemChange()
  } catch (e) {
    itemError.value = e?.data?.statusMessage ?? '保存に失敗しました'
  }
}

const deleteItem = async (id) => {
  if (!confirm('この商品を削除しますか?(購入履歴は残ります)')) return
  await $fetch(`/api/shop/items/${id}`, { method: 'DELETE' })
  await afterItemChange()
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">管理者画面</h1>

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
        <h2 class="box-title">アカウント作成</h2>
        <label class="field-label">ID</label>
        <input v-model="newUser.name" class="field-input" />
        <label class="field-label">パスワード</label>
        <input v-model="newUser.password" type="password" class="field-input" />
        <label class="field-label">初期権限</label>
        <div class="chip-list">
          <button
            v-for="perm in allPermissions ?? []"
            :key="perm.id"
            class="chip"
            :class="{ active: newUser.permissions.includes(perm.name) }"
            :disabled="perm.name === 'admin'"
            @click="
              newUser.permissions.includes(perm.name)
                ? newUser.permissions.splice(newUser.permissions.indexOf(perm.name), 1)
                : newUser.permissions.push(perm.name)
            "
          >
            {{ perm.name }}
          </button>
        </div>
        <button class="save-btn" :disabled="creatingUser" @click="createUser">作成</button>
      </div>

      <div class="box">
        <h2 class="box-title">アカウント一覧</h2>
        <div v-for="u in users ?? []" :key="u.id" class="user-row">
          <div class="user-row-header">
            <span class="user-row-name">{{ u.name }}</span>
            <button
              class="delete-btn"
              :disabled="u.permissions.includes('admin')"
              @click="deleteUser(u.id)"
            >
              削除
            </button>
          </div>
          <div class="chip-list">
            <button
              v-for="perm in allPermissions ?? []"
              :key="perm.id"
              class="chip"
              :class="{ active: u.permissions.includes(perm.name) }"
              :disabled="perm.name === 'admin'"
              @click="togglePermission(u, perm.name)"
            >
              {{ perm.name }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 権限管理 -->
    <div v-if="activeTab === '権限管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">権限作成</h2>
        <div class="inline-form">
          <input v-model="newPermission" class="field-input" placeholder="権限名" />
          <button class="save-btn" @click="createPermission">追加</button>
        </div>
      </div>

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
      </div>
    </div>

    <!-- タグ管理 -->
    <div v-if="activeTab === 'タグ管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">タグ作成</h2>
        <div class="inline-form">
          <input v-model="newTag" class="field-input" placeholder="タグ名" />
          <button class="save-btn" @click="createTag">追加</button>
        </div>
      </div>

      <div class="box">
        <h2 class="box-title">タグ一覧</h2>
        <div v-for="tag in tags ?? []" :key="tag.id" class="list-row">
          <span>{{ tag.name }}</span>
          <button class="delete-btn" @click="deleteTag(tag.id)">削除</button>
        </div>
      </div>
    </div>

    <!-- 所属管理 -->
    <div v-if="activeTab === '所属管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">所属作成</h2>
        <div class="inline-form">
          <input v-model="newAffiliation" class="field-input" placeholder="所属名" />
          <button class="save-btn" @click="createAffiliation">追加</button>
        </div>
      </div>

      <div class="box">
        <h2 class="box-title">所属一覧</h2>
        <div v-for="a in affiliations ?? []" :key="a.id" class="list-row">
          <span>{{ a.name }}</span>
          <button class="delete-btn" @click="deleteAffiliation(a.id)">削除</button>
        </div>
      </div>
    </div>

    <!-- 商品管理 -->
    <div v-if="activeTab === '商品管理'" class="tab-content">
      <div class="box">
        <h2 class="box-title">商品追加</h2>
        <label class="field-label">店</label>
        <select v-model="newItem.shop" class="field-input">
          <option v-for="s in shops" :key="s" :value="s">{{ s }}</option>
        </select>
        <label class="field-label">商品名</label>
        <input v-model="newItem.name" class="field-input" />
        <label class="field-label">価格({{ MONEY_UNIT }})</label>
        <input v-model.number="newItem.price" type="number" min="0" class="field-input" />
        <label class="field-label">在庫(空欄=無制限)</label>
        <input v-model="newItem.stock" type="number" min="0" class="field-input" />
        <label class="field-label">説明</label>
        <textarea v-model="newItem.description" class="field-input" rows="3" />
        <p v-if="itemError && !editingItemId" class="error-text">{{ itemError }}</p>
        <button class="save-btn" :disabled="!newItem.name" @click="createItem">追加</button>
      </div>

      <div v-for="shop in shops" :key="shop" class="box">
        <h2 class="box-title">{{ shop }}の商品</h2>
        <div
          v-for="item in (shopItems ?? []).filter((i) => i.shop === shop)"
          :key="item.id"
          class="user-row"
        >
          <template v-if="editingItemId === item.id">
            <label class="field-label">店</label>
            <select v-model="editItem.shop" class="field-input">
              <option v-for="s in shops" :key="s" :value="s">{{ s }}</option>
            </select>
            <label class="field-label">商品名</label>
            <input v-model="editItem.name" class="field-input" />
            <label class="field-label">価格({{ MONEY_UNIT }})</label>
            <input v-model.number="editItem.price" type="number" min="0" class="field-input" />
            <label class="field-label">在庫(空欄=無制限)</label>
            <input v-model="editItem.stock" type="number" min="0" class="field-input" />
            <label class="field-label">説明</label>
            <textarea v-model="editItem.description" class="field-input" rows="3" />
            <p v-if="itemError" class="error-text">{{ itemError }}</p>
            <div class="inline-form">
              <button class="save-btn" @click="saveItem(item.id)">保存</button>
              <button class="save-btn cancel" @click="editingItemId = null">キャンセル</button>
            </div>
          </template>
          <template v-else>
            <div class="user-row-header">
              <span class="user-row-name">{{ item.name }}</span>
              <div class="inline-form">
                <button class="edit-btn" @click="startEditItem(item)">編集</button>
                <button class="delete-btn" @click="deleteItem(item.id)">削除</button>
              </div>
            </div>
            <p class="item-meta">
              {{ formatMoney(item.price) }} / 在庫: {{ item.stock === null ? '無制限' : item.stock }}
            </p>
          </template>
        </div>
      </div>

      <div class="box">
        <h2 class="box-title">購入履歴(最新100件)</h2>
        <button class="edit-btn" @click="refreshAllPurchases()">再読み込み</button>
        <div v-for="p in allPurchases ?? []" :key="p.id" class="list-row">
          <span class="item-meta">
            {{ formatDateTime(p.created_at) }}<br />
            {{ p.pc_name ?? '(削除済みPC)' }}: [{{ p.shop }}] {{ p.item_name }} ×{{ p.quantity }}
          </span>
          <span class="user-row-name">{{ formatMoney(p.total) }}</span>
        </div>
      </div>
    </div>
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
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 12px;
  font-size: 0.8rem;
  cursor: pointer;
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
  font-size: 0.9rem;
  margin-top: 4px;
}

.inline-form {
  display: flex;
  gap: 8px;
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
</style>