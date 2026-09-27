<script setup>
const { data: fetchedItems, refresh } = await useFetch('/api/settings')

// ローカルの並び替え用配列(APIから取得したデータのコピー)
const localItems = ref([])

watch(
  fetchedItems,
  (val) => {
    localItems.value = val ? [...val].sort((a, b) => a.sort_order - b.sort_order) : []
  },
  { immediate: true }
)

const isOrderChanged = ref(false)

const editingId = ref(null)
const editForm = ref({ title: '', body: '' })
const saving = ref(false)
const deleting = ref(false)
const applyingOrder = ref(false)

const showConfirm = ref(false)
const pendingDeleteId = ref(null)

const creating = ref(false)
const newForm = ref({ title: '', body: '' })

const startEdit = (item) => {
  editingId.value = item.id
  editForm.value = { title: item.title, body: item.body }
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (id) => {
  saving.value = true
  try {
    await $fetch(`/api/settings/${id}`, {
      method: 'PUT',
      body: {
        title: editForm.value.title,
        content: editForm.value.body,
      },
    })
    editingId.value = null
    await refresh()
  } finally {
    saving.value = false
  }
}

const requestDelete = (id) => {
  pendingDeleteId.value = id
  showConfirm.value = true
}

const confirmDelete = async () => {
  if (!pendingDeleteId.value) return
  deleting.value = true
  try {
    await $fetch(`/api/settings/${pendingDeleteId.value}`, { method: 'DELETE' })
    editingId.value = null
    await refresh()
  } finally {
    deleting.value = false
    pendingDeleteId.value = null
  }
}

// ↑↓:ローカル配列内の並び替えのみ(API未呼び出し)
const moveLocal = (id, direction) => {
  const idx = localItems.value.findIndex((i) => i.id === id)
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= localItems.value.length) return

  const arr = [...localItems.value]
  ;[arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]]
  localItems.value = arr
  isOrderChanged.value = true
}

// 「並び順を反映」ボタン:ここで初めてAPIを1回呼ぶ
const applyOrder = async () => {
  applyingOrder.value = true
  try {
    const order = localItems.value.map((item, index) => ({
      id: item.id,
      sortOrder: index + 1,
    }))
    await $fetch('/api/settings/reorder', {
      method: 'POST',
      body: { order },
    })
    isOrderChanged.value = false
    await refresh()
  } catch (e) {
    console.error('並び順の反映に失敗しました', e)
    alert('並び順の反映に失敗しました。もう一度お試しください。')
  } finally {
    applyingOrder.value = false
  }
}

// 「反映キャンセル」ボタン:ローカルの並び替えを元に戻す
const cancelOrder = () => {
  localItems.value = fetchedItems.value
    ? [...fetchedItems.value].sort((a, b) => a.sort_order - b.sort_order)
    : []
  isOrderChanged.value = false
}

const startCreate = () => {
  creating.value = true
  newForm.value = { title: '', body: '' }
}

const cancelCreate = () => {
  creating.value = false
}

const saveCreate = async () => {
  if (!newForm.value.title) return
  saving.value = true
  try {
    const maxOrder = Math.max(0, ...localItems.value.map((i) => i.sort_order ?? 0))
    await $fetch('/api/settings', {
      method: 'POST',
      body: {
        title: newForm.value.title,
        content: newForm.value.body,
        sortOrder: maxOrder + 1,
      },
    })
    creating.value = false
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">背景設定集</h1>

    <AccordionList
      :items="localItems"
      title-key="title"
      body-key="body"
    >
      <template #detail="{ item }">
        <div v-if="editingId === item.id" class="edit-form">
          <label class="edit-label">タイトル</label>
          <input v-model="editForm.title" class="edit-input" />

          <label class="edit-label">本文</label>
          <textarea v-model="editForm.body" class="edit-textarea" rows="4" />

          <div class="edit-actions">
            <button class="save-btn" :disabled="saving" @click="saveEdit(item.id)">
              保存
            </button>
            <button class="cancel-btn" @click="cancelEdit">キャンセル</button>
            <button class="order-btn" @click="moveLocal(item.id, 'up')">↑</button>
            <button class="order-btn" @click="moveLocal(item.id, 'down')">↓</button>
            <button
              class="delete-btn"
              :disabled="deleting"
              @click="requestDelete(item.id)"
            >
              削除
            </button>
          </div>

          <!-- 並び順反映ボタン(矢印ボタンの下、枠内、小サイズ) -->
          <div v-if="isOrderChanged" class="apply-order-row">
            <button class="apply-order-btn-sm" :disabled="applyingOrder" @click="applyOrder">
              並び順を反映する
            </button>
            <button class="cancel-order-btn-sm" :disabled="applyingOrder" @click="cancelOrder">
              反映キャンセル
            </button>
          </div>
        </div>

        <div v-else class="view-mode">
          <MarkdownText :text="item.body" />
          <button class="edit-btn" @click="startEdit(item)">編集</button>
        </div>
      </template>
    </AccordionList>

    <!-- 項目追加(一番下) -->
    <div class="add-box">
      <button v-if="!creating" class="add-btn" @click="startCreate">
        ＋ 項目追加
      </button>

      <div v-else class="edit-form">
        <label class="edit-label">タイトル</label>
        <input v-model="newForm.title" class="edit-input" placeholder="タイトルを入力" />

        <label class="edit-label">本文</label>
        <textarea v-model="newForm.body" class="edit-textarea" rows="4" placeholder="本文を入力" />

        <div class="edit-actions">
          <button class="save-btn" :disabled="saving || !newForm.title" @click="saveCreate">
            保存
          </button>
          <button class="cancel-btn" @click="cancelCreate">キャンセル</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showConfirm"
      title="項目の削除"
      message="この項目を削除します。この操作は取り消せません。よろしいですか?"
      @confirm="confirmDelete"
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
  margin-bottom: 20px;
}

/* 項目追加 */
.add-box {
  margin-top: 16px;
}

.add-btn {
  width: 100%;
  box-sizing: border-box;
  border: 2px dashed var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
}

.add-btn:active {
  background: var(--color-accent, #ffd400);
}

/* 通常表示 */
.view-mode {
  padding: 14px;
}

.accordion-body {
  margin: 0 0 10px;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text, #000);
  white-space: pre-line;
}

.edit-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: var(--color-text, #000);
  font-size: 0.8rem;
  padding: 4px 10px;
  cursor: pointer;
}

/* 編集/追加フォーム */
.edit-form {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
}

.edit-label {
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-text, #000);
}

.edit-input,
.edit-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 8px;
  font-size: 0.9rem;
  color: var(--color-text, #000);
  background: var(--color-bg, #fff);
  font-family: inherit;
}

.edit-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.save-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: var(--color-text, #000);
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
}

.order-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 10px;
  font-size: 0.85rem;
  cursor: pointer;
  line-height: 1;
}

.delete-btn {
  border: 1px solid #c00;
  background: var(--color-bg, #fff);
  color: #c00;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  margin-left: auto;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 並び順反映ボタン(小サイズ、枠内) */
.apply-order-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.apply-order-btn-sm {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: var(--color-text, #000);
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
}

.apply-order-btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-order-btn-sm {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
}

.cancel-order-btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>