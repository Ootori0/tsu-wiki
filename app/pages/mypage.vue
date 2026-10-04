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

const { resize } = useAutoResize()
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
const { data: fetchedMagics, refresh: refreshMagics } = await useCachedFetch('/api/magics/mine', {
  key: 'my-magics-list',
})
const { data: allPermsList } = await useCachedFetch('/api/permissions', {
  key: 'permissions-list',
})
const { data: allTags } = await useCachedFetch('/api/tags', {
  key: 'tags-list',
})
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

const startEdit = async (item) => {
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

  await nextTick()
  document.querySelectorAll('.auto-wrap').forEach((el) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  })
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

// --- 自分のPC一覧 ---
const { data: fetchedPcs, refresh: refreshPcsRaw } = await useCachedFetch('/api/pcs/mine', {
  key: 'my-pcs-list',
})
const { data: allAffiliations } = await useCachedFetch('/api/affiliations', {
  key: 'affiliations-list',
})
// フォームの値をAPIの形に変換して表示例に使う
const formPreview = (form) => ({
  name: form.name || '名前',
  affiliation: form.affiliation,
  office: form.office,
  grade: form.grade,
  is_representative: form.isRepresentative,
  is_office_representative: form.isOfficeRepresentative,
  show_title: form.showTitle,
  show_office: form.showOffice,
})

const myPcItems = computed(() =>
  (fetchedPcs.value ?? []).map((pc) => ({ ...pc, title: pcTitle(pc) }))
)
const grades = Array.from({ length: 10 }, (_, i) => i + 1)

const emptyPcForm = () => ({
  name: '',
  affiliation: '',
  office: '',
  grade: 10,
  memo: '',
  isRepresentative: false,
  isOfficeRepresentative: false,
  showTitle: true,
  showOffice: true,
})

const refreshPcs = async () => {
  // PCタブの一覧キャッシュも破棄して次回表示時に再取得させる
  clearNuxtData('pcs-list')
  await refreshPcsRaw()
}

const pcEditingId = ref(null)
const pcEditForm = ref(emptyPcForm())
const pcCreating = ref(false)
const pcNewForm = ref(emptyPcForm())
const pcSaving = ref(false)
const pcDeleting = ref(false)
const pcError = ref('')

const showPcConfirm = ref(false)
const pendingPcDeleteId = ref(null)

const startPcEdit = async (item) => {
  pcError.value = ''
  pcEditingId.value = item.id
  pcEditForm.value = {
    name: item.name,
    affiliation: item.affiliation ?? '',
    office: item.office ?? '',
    grade: item.grade,
    memo: item.memo ?? '',
    isRepresentative: item.is_representative,
    isOfficeRepresentative: item.is_office_representative,
    showTitle: item.show_title,
    showOffice: item.show_office,
  }

  await nextTick()
  document.querySelectorAll('.auto-wrap').forEach((el) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  })
}

const cancelPcEdit = () => {
  pcEditingId.value = null
}

const savePcEdit = async (id) => {
  pcError.value = ''
  pcSaving.value = true
  try {
    await $fetch(`/api/pcs/${id}`, { method: 'PUT', body: pcEditForm.value })
    pcEditingId.value = null
    await refreshPcs()
  } catch (e) {
    pcError.value = e?.data?.statusMessage ?? '保存に失敗しました'
  } finally {
    pcSaving.value = false
  }
}

const requestPcDelete = (id) => {
  pendingPcDeleteId.value = id
  showPcConfirm.value = true
}

const confirmPcDelete = async () => {
  if (!pendingPcDeleteId.value) return
  pcDeleting.value = true
  try {
    await $fetch(`/api/pcs/${pendingPcDeleteId.value}`, { method: 'DELETE' })
    pcEditingId.value = null
    await refreshPcs()
  } finally {
    pcDeleting.value = false
    pendingPcDeleteId.value = null
  }
}

const startPcCreate = () => {
  pcError.value = ''
  pcCreating.value = true
  pcNewForm.value = emptyPcForm()
}

const cancelPcCreate = () => {
  pcCreating.value = false
}

const savePcCreate = async () => {
  if (!pcNewForm.value.name) return
  pcError.value = ''
  pcSaving.value = true
  try {
    await $fetch('/api/pcs', { method: 'POST', body: pcNewForm.value })
    pcCreating.value = false
    await refreshPcs()
  } catch (e) {
    pcError.value = e?.data?.statusMessage ?? '保存に失敗しました'
  } finally {
    pcSaving.value = false
  }
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
            <textarea v-model="editForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">所持者</label>
            <textarea v-model="editForm.owner" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">コスト</label>
            <textarea v-model="editForm.cost" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">発動条件</label>
            <textarea v-model="editForm.condition" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">効果</label>
            <textarea v-model="editForm.effect" class="edit-textarea auto-wrap" rows="3" @input="resize" />
            <p class="markdown-hint">
            # 見出し **太字** *斜体* ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
            </p>
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
            <MarkdownText :text="item.effect" />
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
            <textarea v-model="newForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">所持者</label>
            <textarea v-model="newForm.owner" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">コスト</label>
            <textarea v-model="newForm.cost" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">発動条件</label>
            <textarea v-model="newForm.condition" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">効果</label>
            <textarea v-model="newForm.effect" class="edit-textarea auto-wrap" rows="3" @input="resize" />
            <p class="markdown-hint">
            # 見出し **太字** *斜体* ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
            </p>
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

    <!-- 自分のPC一覧 -->
    <div class="box">
      <h2 class="box-title">あなたのPC一覧</h2>

      <AccordionList :items="myPcItems" title-key="title" body-key="memo">
        <template #detail="{ item }">
          <div v-if="pcEditingId === item.id" class="edit-form">
            <label class="edit-label">名前</label>
            <textarea v-model="pcEditForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">画像</label>
            <p class="markdown-hint">画像アップロードは準備中です</p>

            <label class="edit-label">所属</label>
            <select v-model="pcEditForm.affiliation" class="edit-input">
              <option value="">(未設定)</option>
              <option v-for="a in allAffiliations ?? []" :key="a.id" :value="a.name">{{ a.name }}</option>
            </select>

            <label class="edit-label">事務所</label>
            <textarea v-model="pcEditForm.office" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">級</label>
            <select v-model.number="pcEditForm.grade" class="edit-input">
              <option v-for="g in grades" :key="g" :value="g">{{ g }}級</option>
            </select>

            <label class="check-label">
              <input v-model="pcEditForm.isRepresentative" type="checkbox" />
              協会の代表
            </label>

            <label class="check-label">
              <input v-model="pcEditForm.isOfficeRepresentative" type="checkbox" />
              事務所の代表
            </label>

            <label class="check-label">
              <input v-model="pcEditForm.showTitle" type="checkbox" />
              名前と一緒に肩書きを表示
            </label>

            <label class="check-label">
              <input v-model="pcEditForm.showOffice" type="checkbox" :disabled="!pcEditForm.showTitle" />
              肩書きに事務所を表示
            </label>

            <p class="markdown-hint">表示例: {{ pcTitle(formPreview(pcEditForm)) }}</p>

            <label class="edit-label">メモ</label>
            <textarea v-model="pcEditForm.memo" class="edit-textarea auto-wrap" rows="3" @input="resize" />
            <p class="markdown-hint">
            # 見出し **太字** *斜体* ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
            </p>
            <p v-if="pcError" class="error-text">{{ pcError }}</p>

            <div class="edit-actions">
              <button class="save-btn" :disabled="pcSaving" @click="savePcEdit(item.id)">保存</button>
              <button class="cancel-btn" @click="cancelPcEdit">キャンセル</button>
              <button class="delete-btn" :disabled="pcDeleting" @click="requestPcDelete(item.id)">削除</button>
            </div>
          </div>

          <div v-else class="view-mode">
            <p class="meta-line">
              所属: {{ item.affiliation || '-' }} / 事務所: {{ item.office || '-' }} / {{ item.grade }}級<template v-if="pcRoles(item)"> / {{ pcRoles(item) }}</template>
            </p>
            <MarkdownText :text="item.memo" />
            <button class="edit-btn" @click="startPcEdit(item)">編集</button>
          </div>
        </template>
      </AccordionList>

      <!-- 新規作成 -->
      <div class="add-box">
        <button v-if="!pcCreating" class="add-btn" @click="startPcCreate">＋ PCを作成</button>

        <div v-else class="edit-form">
            <label class="edit-label">名前</label>
            <textarea v-model="pcNewForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">画像</label>
            <p class="markdown-hint">画像アップロードは準備中です</p>

            <label class="edit-label">所属</label>
            <select v-model="pcNewForm.affiliation" class="edit-input">
              <option value="">(未設定)</option>
              <option v-for="a in allAffiliations ?? []" :key="a.id" :value="a.name">{{ a.name }}</option>
            </select>

            <label class="edit-label">事務所</label>
            <textarea v-model="pcNewForm.office" class="edit-input auto-wrap" rows="1" @input="resize" />

            <label class="edit-label">級</label>
            <select v-model.number="pcNewForm.grade" class="edit-input">
              <option v-for="g in grades" :key="g" :value="g">{{ g }}級</option>
            </select>

            <label class="check-label">
              <input v-model="pcNewForm.isRepresentative" type="checkbox" />
              協会の代表
            </label>

            <label class="check-label">
              <input v-model="pcNewForm.isOfficeRepresentative" type="checkbox" />
              事務所の代表
            </label>

            <label class="check-label">
              <input v-model="pcNewForm.showTitle" type="checkbox" />
              名前と一緒に肩書きを表示
            </label>

            <label class="check-label">
              <input v-model="pcNewForm.showOffice" type="checkbox" :disabled="!pcNewForm.showTitle" />
              肩書きに事務所を表示
            </label>

            <p class="markdown-hint">表示例: {{ pcTitle(formPreview(pcNewForm)) }}</p>

            <label class="edit-label">メモ</label>
            <textarea v-model="pcNewForm.memo" class="edit-textarea auto-wrap" rows="3" @input="resize" />
            <p class="markdown-hint">
            # 見出し **太字** *斜体* ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
            </p>
            <p v-if="pcError" class="error-text">{{ pcError }}</p>

          <div class="edit-actions">
            <button class="save-btn" :disabled="pcSaving || !pcNewForm.name" @click="savePcCreate">保存</button>
            <button class="cancel-btn" @click="cancelPcCreate">キャンセル</button>
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

    <ConfirmDialog
      v-model="showPcConfirm"
      title="PCの削除"
      message="このPCを削除します。この操作は取り消せません。よろしいですか?"
      @confirm="confirmPcDelete"
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

.auto-wrap {
  resize: none;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
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

.check-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: bold;
}

.markdown-hint {
  font-size: 0.7rem;
  opacity: 0.6;
  margin: 2px 0 0;
}
</style>