<script setup>
definePageMeta({ middleware: 'auth' })

const { user, fetchUser } = useAuth()

// --- ID変更 ---
const newName = ref(user.value?.name ?? '')
const nameError = ref('')
const savingName = ref(false)

const saveName = async () => {
  nameError.value = ''
  savingName.value = true
  try {
    await $fetch('/api/auth/name', { method: 'PUT', body: { name: newName.value } })
    await fetchUser()
  } catch (e) {
    nameError.value = e?.data?.statusMessage ?? '変更に失敗しました'
  } finally {
    savingName.value = false
  }
}

// --- パスワード変更 ---
const passwordAccordionOpen = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')
const passwordError = ref('')
const passwordSuccess = ref(false)
const savingPassword = ref(false)

const savePassword = async () => {
  passwordError.value = ''
  passwordSuccess.value = false

  if (newPassword.value !== newPasswordConfirm.value) {
    passwordError.value = '新しいパスワードが一致しません'
    return
  }

  savingPassword.value = true
  try {
    await $fetch('/api/auth/password', {
      method: 'PUT',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })
    currentPassword.value = ''
    newPassword.value = ''
    newPasswordConfirm.value = ''
    passwordSuccess.value = true
  } catch (e) {
    passwordError.value = e?.data?.statusMessage ?? '変更に失敗しました'
  } finally {
    savingPassword.value = false
  }
}

// --- 自分の魔法一覧 ---
const { data: fetchedMagics, refresh: refreshMagics } = await useFetch('/api/magics/mine')
const { data: allPermsList } = await useFetch('/api/permissions')
const { data: allTags } = await useFetch('/api/tags')

const magicTypes = ['魔法', '魔道具', 'AF', '魔術・その他']

const editingId = ref(null)
const editForm = ref({
  type: '魔法', name: '', owner: '', tags: [], cost: '', condition: '', effect: '', visiblePermissions: [],
})
const saving = ref(false)
const deleting = ref(false)

const showConfirm = ref(false)
const pendingDeleteId = ref(null)

const creating = ref(false)
const newForm = ref({
  type: '魔法', name: '', owner: '', tags: [], cost: '', condition: '', effect: '', visiblePermissions: [],
})

const startEdit = (item) => {
  editingId.value = item.id
  editForm.value = {
    type: item.type,
    name: item.name,
    owner: item.owner,
    tags: [...item.tags],
    cost: item.cost,
    condition: item.condition,
    effect: item.effect,
    visiblePermissions: [...item.visible_permissions],
  }
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (id) => {
  saving.value = true
  try {
    await $fetch(`/api/magics/${id}`, { method: 'PUT', body: editForm.value })
    editingId.value = null
    await refreshMagics()
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
    await $fetch(`/api/magics/${pendingDeleteId.value}`, { method: 'DELETE' })
    editingId.value = null
    await refreshMagics()
  } finally {
    deleting.value = false
    pendingDeleteId.value = null
  }
}

const startCreate = () => {
  creating.value = true
  newForm.value = {
    type: '魔法', name: '', owner: '', tags: [], cost: '', condition: '', effect: '', visiblePermissions: [],
  }
}

const cancelCreate = () => {
  creating.value = false
}

const saveCreate = async () => {
  if (!newForm.value.name) return
  saving.value = true
  try {
    await $fetch('/api/magics', { method: 'POST', body: newForm.value })
    creating.value = false
    await refreshMagics()
  } finally {
    saving.value = false
  }
}

const toggleFormTag = (form, tagName) => {
  const idx = form.tags.indexOf(tagName)
  if (idx === -1) form.tags.push(tagName)
  else form.tags.splice(idx, 1)
}

const toggleFormPerm = (form, permName) => {
  const idx = form.visiblePermissions.indexOf(permName)
  if (idx === -1) form.visiblePermissions.push(permName)
  else form.visiblePermissions.splice(idx, 1)
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">ユーザーページ</h1>

    <!-- アカウント情報 -->
    <div class="box">
      <h2 class="box-title">アカウント情報</h2>

      <label class="field-label">ID</label>
      <div class="inline-form">
        <input v-model="newName" class="field-input" />
        <button class="save-btn" :disabled="savingName" @click="saveName">変更</button>
      </div>
      <p v-if="nameError" class="error-text">{{ nameError }}</p>

      <label class="field-label">権限</label>
      <div class="chip-list">
        <span v-for="perm in user?.permissions ?? []" :key="perm" class="chip active">
          {{ perm }}
        </span>
      </div>

      <!-- パスワード変更(アコーディオン) -->
      <div class="password-accordion">
        <button class="password-accordion-header" @click="passwordAccordionOpen = !passwordAccordionOpen">
          <span>パスワード変更</span>
          <span class="password-accordion-icon" :class="{ open: passwordAccordionOpen }">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M8 5l8 7-8 7z" fill="currentColor" />
            </svg>
          </span>
        </button>

        <div class="password-outer" :class="{ open: passwordAccordionOpen }">
          <div class="password-inner">
            <label class="field-label">現在のパスワード</label>
            <input v-model="currentPassword" type="password" class="field-input" />

            <label class="field-label">新しいパスワード</label>
            <input v-model="newPassword" type="password" class="field-input" />

            <label class="field-label">新しいパスワード(確認)</label>
            <input v-model="newPasswordConfirm" type="password" class="field-input" />

            <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
            <p v-if="passwordSuccess" class="success-text">パスワードを変更しました</p>

            <button class="save-btn" :disabled="savingPassword" style="margin-top: 8px;" @click="savePassword">
              パスワードを変更
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自分の魔法一覧 -->
    <div class="box">
      <h2 class="box-title">あなたの魔法一覧</h2>

      <AccordionList :items="fetchedMagics ?? []" title-key="name" body-key="effect">
        <template #detail="{ item }">
          <div v-if="editingId === item.id" class="edit-form">
            <label class="edit-label">区分</label>
            <select v-model="editForm.type" class="edit-input">
              <option v-for="t in magicTypes" :key="t" :value="t">{{ t }}</option>
            </select>

            <label class="edit-label">名称</label>
            <input v-model="editForm.name" class="edit-input" />

            <label class="edit-label">所持者</label>
            <input v-model="editForm.owner" class="edit-input" />

            <label class="edit-label">コスト</label>
            <input v-model="editForm.cost" class="edit-input" />

            <label class="edit-label">発動条件</label>
            <input v-model="editForm.condition" class="edit-input" />

            <label class="edit-label">効果</label>
            <textarea v-model="editForm.effect" class="edit-textarea" rows="3" />

            <label class="edit-label">タグ</label>
            <div class="chip-list">
              <button
                v-for="tag in allTags ?? []"
                :key="tag.id"
                class="chip"
                :class="{ active: editForm.tags.includes(tag.name) }"
                @click="toggleFormTag(editForm, tag.name)"
              >
                {{ tag.name }}
              </button>
            </div>

            <label class="edit-label">閲覧可能権限(空=誰でも閲覧可)</label>
            <div class="chip-list">
              <button
                v-for="perm in allPermsList ?? []"
                :key="perm.id"
                class="chip"
                :class="{ active: editForm.visiblePermissions.includes(perm.name) }"
                @click="toggleFormPerm(editForm, perm.name)"
              >
                {{ perm.name }}
              </button>
            </div>

            <div class="edit-actions">
              <button class="save-btn" :disabled="saving" @click="saveEdit(item.id)">保存</button>
              <button class="cancel-btn" @click="cancelEdit">キャンセル</button>
              <button class="delete-btn" :disabled="deleting" @click="requestDelete(item.id)">削除</button>
            </div>
          </div>

          <div v-else class="view-mode">
            <p class="meta-line">区分: {{ item.type }} / 所持者: {{ item.owner || '-' }}</p>
            <p class="meta-line">コスト: {{ item.cost || '-' }} / 発動条件: {{ item.condition || '-' }}</p>
            <p class="accordion-body">{{ item.effect }}</p>
            <button class="edit-btn" @click="startEdit(item)">編集</button>
          </div>
        </template>
      </AccordionList>

      <!-- 新規作成 -->
      <div class="add-box">
        <button v-if="!creating" class="add-btn" @click="startCreate">＋ 魔法を作成</button>

        <div v-else class="edit-form">
          <label class="edit-label">区分</label>
          <select v-model="newForm.type" class="edit-input">
            <option v-for="t in magicTypes" :key="t" :value="t">{{ t }}</option>
          </select>

          <label class="edit-label">名称</label>
          <input v-model="newForm.name" class="edit-input" />

          <label class="edit-label">所持者</label>
          <input v-model="newForm.owner" class="edit-input" />

          <label class="edit-label">コスト</label>
          <input v-model="newForm.cost" class="edit-input" />

          <label class="edit-label">発動条件</label>
          <input v-model="newForm.condition" class="edit-input" />

          <label class="edit-label">効果</label>
          <textarea v-model="newForm.effect" class="edit-textarea" rows="3" />

          <label class="edit-label">タグ</label>
          <div class="chip-list">
            <button
              v-for="tag in allTags ?? []"
              :key="tag.id"
              class="chip"
              :class="{ active: newForm.tags.includes(tag.name) }"
              @click="toggleFormTag(newForm, tag.name)"
            >
              {{ tag.name }}
            </button>
          </div>

          <label class="edit-label">閲覧可能権限(空=誰でも閲覧可)</label>
          <div class="chip-list">
            <button
              v-for="perm in allPermsList ?? []"
              :key="perm.id"
              class="chip"
              :class="{ active: newForm.visiblePermissions.includes(perm.name) }"
              @click="toggleFormPerm(newForm, perm.name)"
            >
              {{ perm.name }}
            </button>
          </div>

          <div class="edit-actions">
            <button class="save-btn" :disabled="saving || !newForm.name" @click="saveCreate">保存</button>
            <button class="cancel-btn" @click="cancelCreate">キャンセル</button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model="showConfirm"
      title="魔法の削除"
      message="この魔法を削除します。この操作は取り消せません。よろしいですか?"
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
  margin-bottom: 16px;
}

.box {
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  padding: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.box-title {
  font-size: 1rem;
  margin: 0 0 10px;
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: bold;
  margin-top: 8px;
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

.error-text {
  color: #c00;
  font-size: 0.8rem;
  margin: 4px 0 0;
}

.success-text {
  color: #0a0;
  font-size: 0.8rem;
  margin: 4px 0 0;
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
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  padding: 8px 16px;
  font-size: 0.85rem;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* パスワード変更アコーディオン */
.password-accordion {
  margin-top: 14px;
  border-top: 1px dashed var(--color-text, #000);
  padding-top: 10px;
}

.password-accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  padding: 4px 0;
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-text, #000);
  cursor: pointer;
}

.password-accordion-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text, #000);
  transition: transform 0.25s ease;
}

.password-accordion-icon.open {
  transform: rotate(90deg);
}

.password-outer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.password-outer.open {
  grid-template-rows: 1fr;
}

.password-inner {
  overflow: hidden;
  min-height: 0;
}

.view-mode {
  padding: 14px;
}

.meta-line {
  margin: 0 0 4px;
  font-size: 0.8rem;
  opacity: 0.75;
}

.accordion-body {
  margin: 6px 0 10px;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-line;
}

.edit-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  font-size: 0.8rem;
  padding: 4px 10px;
  cursor: pointer;
}

.edit-form {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  box-sizing: border-box;
}

.edit-label {
  font-size: 0.75rem;
  font-weight: bold;
}

.edit-input,
.edit-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 8px;
  font-size: 0.9rem;
  font-family: inherit;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.cancel-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
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

.add-box {
  margin-top: 12px;
}

.add-btn {
  width: 100%;
  box-sizing: border-box;
  border: 2px dashed var(--color-text, #000);
  background: var(--color-bg, #fff);
  padding: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
}
</style>