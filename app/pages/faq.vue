<script setup>
const { show } = useToast()
const { data: fetchedItems, refresh } = await useCachedFetch('/api/faqs', {
  key: 'faqs-list',
})
const localItems = ref([])

watch(
  fetchedItems,
  (val) => {
    localItems.value = val ? [...val].sort((a, b) => a.sort_order - b.sort_order) : []
  },
  { immediate: true }
)

const isOrderChanged = ref(false)
const searchQuery = ref('')

const editingId = ref(null)
const editForm = ref({ question: '', answer: '' })
const saving = ref(false)
const deleting = ref(false)
const applyingOrder = ref(false)

const showConfirm = ref(false)
const pendingDeleteId = ref(null)

const creating = ref(false)
const newForm = ref({ question: '', answer: '' })

const startEdit = (item) => {
  editingId.value = item.id
  editForm.value = { question: item.question, answer: item.answer }
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (id) => {
  saving.value = true
  try {
    await $fetch(`/api/faqs/${id}`, {
      method: 'PUT',
      body: {
        question: editForm.value.question,
        answer: editForm.value.answer,
      },
    })
    editingId.value = null
    await refresh()
    show('保存しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '保存に失敗しました', 'error')
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
    await $fetch(`/api/faqs/${pendingDeleteId.value}`, { method: 'DELETE' })
    editingId.value = null
    await refresh()
    show('削除しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '削除に失敗しました', 'error')
  } finally {
    deleting.value = false
    pendingDeleteId.value = null
  }
}

const moveLocal = (id, direction) => {
  const idx = localItems.value.findIndex((i) => i.id === id)
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= localItems.value.length) return

  const arr = [...localItems.value]
  ;[arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]]
  localItems.value = arr
  isOrderChanged.value = true
}

const applyOrder = async () => {
  applyingOrder.value = true
  try {
    const order = localItems.value.map((item, index) => ({
      id: item.id,
      sortOrder: index + 1,
    }))
    await $fetch('/api/faqs/reorder', {
      method: 'POST',
      body: { order },
    })
    isOrderChanged.value = false
    await refresh()
    show('並び順を反映しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '並び順の反映に失敗しました', 'error')
  } finally {
    applyingOrder.value = false
  }
}

const cancelOrder = () => {
  localItems.value = fetchedItems.value
    ? [...fetchedItems.value].sort((a, b) => a.sort_order - b.sort_order)
    : []
  isOrderChanged.value = false
}

const startCreate = () => {
  creating.value = true
  newForm.value = { question: '', answer: '' }
}

const cancelCreate = () => {
  creating.value = false
}

const saveCreate = async () => {
  if (!newForm.value.question) return
  saving.value = true
  try {
    const maxOrder = Math.max(0, ...localItems.value.map((i) => i.sort_order ?? 0))
    await $fetch('/api/faqs', {
      method: 'POST',
      body: {
        question: newForm.value.question,
        answer: newForm.value.answer,
        sortOrder: maxOrder + 1,
      },
    })
    creating.value = false
    await refresh()
    show('追加しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '追加に失敗しました', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">よくある質問,裁定</h1>

    <!-- ページ内検索ボックス(外形のみ、フィルタ未実装) -->
    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="キーワードで検索(未完成)"
        class="search-input"
      />
    </div>

    <p v-if="localItems.length === 0" class="empty">まだ項目がありません</p>
    <AccordionList
      :items="localItems"
      title-key="question"
      body-key="answer"
    >
      <template #detail="{ item }">
        <div v-if="editingId === item.id" class="edit-form">
          <label class="edit-label">質問(タイトル)</label>
          <input v-model="editForm.question" class="edit-input" />

          <label class="edit-label">回答</label>
          <textarea v-model="editForm.answer" class="edit-textarea" rows="4" />

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

          <!-- 並び順反映ボタン -->
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
          <MarkdownText :text="item.answer" />
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
        <label class="edit-label">質問(タイトル)</label>
        <input v-model="newForm.question" class="edit-input" placeholder="質問を入力" />

        <label class="edit-label">回答</label>
        <textarea v-model="newForm.answer" class="edit-textarea" rows="4" placeholder="回答を入力" />

        <div class="edit-actions">
          <button class="save-btn" :disabled="saving || !newForm.question" @click="saveCreate">
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

.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 10px 12px;
  font-size: 16px;
}

.search-input:focus {
  outline: 2px solid var(--color-accent, #ffd400);
  outline-offset: -2px;
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
  font-size: 16px;
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

/* 並び順反映ボタン */
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