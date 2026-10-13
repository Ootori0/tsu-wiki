<script setup>
definePageMeta({ middleware: 'auth' })

const { user, fetchUser } = useAuth()
const { show } = useToast()
const { openMoneyDialog } = useMoneyDialog()

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
    show('IDを変更しました')
  } catch (e) {
    nameError.value = e?.data?.statusMessage ?? '変更に失敗しました'
  } finally {
    savingName.value = false
  }
}

const { resize, fitAll: fitTextareas } = useAutoResize()
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
    show('パスワードを変更しました')
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

const emptyMagicForm = () => ({
  type: '魔法', name: '', owner: '', tags: [], cost: '', condition: '', effect: '', visiblePermissions: [],
})

// 記入・編集はポップアップで行う(編集中の id が null なら新規作成)
const magicDialogOpen = ref(false)
const magicEditingId = ref(null)
const magicForm = ref(emptyMagicForm())
const saving = ref(false)
const deleting = ref(false)
const showConfirm = ref(false)

const openMagicCreate = () => {
  magicEditingId.value = null
  magicForm.value = emptyMagicForm()
  magicDialogOpen.value = true
}

const openMagicEdit = (item) => {
  magicEditingId.value = item.id
  magicForm.value = {
    type: item.type,
    name: item.name,
    owner: item.owner,
    tags: [...item.tags],
    cost: item.cost,
    condition: item.condition,
    effect: item.effect,
    visiblePermissions: [...item.visible_permissions],
  }
  magicDialogOpen.value = true
  fitTextareas()
}

const saveMagic = async () => {
  if (!magicForm.value.name) return
  const id = magicEditingId.value
  saving.value = true
  try {
    if (id) await $fetch(`/api/magics/${id}`, { method: 'PUT', body: magicForm.value })
    else await $fetch('/api/magics', { method: 'POST', body: magicForm.value })
    magicDialogOpen.value = false
    await refreshMagics()
    show(id ? '魔法を保存しました' : '魔法を作成しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '保存に失敗しました', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async () => {
  if (!magicEditingId.value) return
  deleting.value = true
  try {
    await $fetch(`/api/magics/${magicEditingId.value}`, { method: 'DELETE' })
    magicDialogOpen.value = false
    await refreshMagics()
    show('魔法を削除しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '削除に失敗しました', 'error')
  } finally {
    deleting.value = false
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

// 一覧ごと折りたためる見出し(件数つき)
const magicSection = computed(() => [{ id: 'magics', title: 'あなたの魔法一覧', count: (fetchedMagics.value ?? []).length }])
const pcSection = computed(() => [{ id: 'pcs', title: 'あなたのPC一覧', count: (fetchedPcs.value ?? []).length }])

const myPcItems = computed(() =>
  (fetchedPcs.value ?? []).map((pc) => ({ ...pc, title: pcTitle(pc) }))
)
const grades = Array.from({ length: 10 }, (_, i) => i + 1)

const emptyPcForm = () => ({
  name: '',
  affiliation: '',
  office: '',
  grade: 10,
  money: 0,
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

// 記入・編集はポップアップで行う(編集中の id が null なら新規作成)
const pcDialogOpen = ref(false)
const pcEditingId = ref(null)
const pcForm = ref(emptyPcForm())
const pcSaving = ref(false)
const pcDeleting = ref(false)
const pcError = ref('')
const showPcConfirm = ref(false)

const openPcCreate = () => {
  pcError.value = ''
  pcEditingId.value = null
  pcForm.value = emptyPcForm()
  pcDialogOpen.value = true
}

const openPcEdit = (item) => {
  pcError.value = ''
  pcEditingId.value = item.id
  pcForm.value = {
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
  pcDialogOpen.value = true
  fitTextareas()
}

const savePc = async () => {
  if (!pcForm.value.name) return
  const id = pcEditingId.value
  pcError.value = ''
  pcSaving.value = true
  try {
    if (id) await $fetch(`/api/pcs/${id}`, { method: 'PUT', body: pcForm.value })
    else await $fetch('/api/pcs', { method: 'POST', body: pcForm.value })
    pcDialogOpen.value = false
    await refreshPcs()
    show(id ? 'PCを保存しました' : 'PCを作成しました')
  } catch (e) {
    pcError.value = e?.data?.statusMessage ?? '保存に失敗しました'
  } finally {
    pcSaving.value = false
  }
}

const confirmPcDelete = async () => {
  if (!pcEditingId.value) return
  pcDeleting.value = true
  try {
    await $fetch(`/api/pcs/${pcEditingId.value}`, { method: 'DELETE' })
    pcDialogOpen.value = false
    await refreshPcs()
    show('PCを削除しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '削除に失敗しました', 'error')
  } finally {
    pcDeleting.value = false
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

    <!-- 所持金(ダイアログで編集) -->
    <button class="money-open-btn" @click="openMoneyDialog()">
      <v-icon icon="mdi-cash" size="20" />
      <span>所持金の増減・履歴</span>
    </button>

    <!-- 自分の魔法一覧(表示はアコーディオン、記入・編集はポップアップ) -->
    <AccordionList :items="magicSection" class="section-accordion">
      <template #title="{ item }">
        <span class="section-title">{{ item.title }}</span>
        <span class="section-count">{{ item.count }}件</span>
      </template>
      <template #detail>
        <div class="section-body">
          <p v-if="!(fetchedMagics ?? []).length" class="empty">まだ魔法がありません</p>
          <AccordionList :items="fetchedMagics ?? []" title-key="name">
            <template #detail="{ item }">
              <div class="view-mode">
                <p class="meta-line">区分: {{ item.type }} / 所持者: {{ item.owner || '-' }}</p>
                <p class="meta-line">コスト: {{ item.cost || '-' }} / 発動条件: {{ item.condition || '-' }}</p>
                <MarkdownText :text="item.effect" />
                <button class="edit-btn" @click="openMagicEdit(item)">編集</button>
              </div>
            </template>
          </AccordionList>
          <button class="add-btn" @click="openMagicCreate">＋ 魔法を作成</button>
        </div>
      </template>
    </AccordionList>

    <!-- 自分のPC一覧(表示はアコーディオン、記入・編集はポップアップ) -->
    <AccordionList :items="pcSection" class="section-accordion">
      <template #title="{ item }">
        <span class="section-title">{{ item.title }}</span>
        <span class="section-count">{{ item.count }}件</span>
      </template>
      <template #detail>
        <div class="section-body">
          <p v-if="!myPcItems.length" class="empty">まだPCがありません</p>
          <AccordionList :items="myPcItems" title-key="title">
            <template #detail="{ item }">
              <div class="view-mode">
                <p class="meta-line">
                  所属: {{ item.affiliation || '-' }} / 事務所: {{ item.office || '-' }} / {{ item.grade }}級<template v-if="pcRoles(item)"> / {{ pcRoles(item) }}</template>
                </p>
                <MarkdownText :text="item.memo" />
                <div class="money-row">
                  <span class="money-label">{{ moneyLabel(item) }}</span>
                  <span class="money-value" :class="{ negative: item.money < 0 }">{{ formatBalance(item) }}</span>
                  <button class="money-edit-btn" @click="openMoneyDialog(item.id)">増減・履歴</button>
                </div>
                <button class="edit-btn" @click="openPcEdit(item)">編集</button>
              </div>
            </template>
          </AccordionList>
          <button class="add-btn" @click="openPcCreate">＋ PCを作成</button>
        </div>
      </template>
    </AccordionList>

    <!-- 魔法の記入・編集 -->
    <FormDialog v-model="magicDialogOpen" :title="magicEditingId ? '魔法の編集' : '魔法の作成'">
      <label class="edit-label">区分</label>
      <select v-model="magicForm.type" class="edit-input">
        <option v-for="t in magicTypes" :key="t" :value="t">{{ t }}</option>
      </select>

      <label class="edit-label">名称</label>
      <textarea v-model="magicForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">所持者</label>
      <textarea v-model="magicForm.owner" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">コスト</label>
      <textarea v-model="magicForm.cost" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">発動条件</label>
      <textarea v-model="magicForm.condition" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">効果</label>
      <textarea v-model="magicForm.effect" class="edit-textarea auto-wrap" rows="3" @input="resize" />
      <p class="markdown-hint">
        # 見出し **太字** ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
      </p>

      <label class="edit-label">タグ</label>
      <div class="chip-list">
        <button
          v-for="tag in allTags ?? []"
          :key="tag.id"
          class="chip"
          :class="{ active: magicForm.tags.includes(tag.name) }"
          @click="toggleFormTag(magicForm, tag.name)"
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
          :class="{ active: magicForm.visiblePermissions.includes(perm.name) }"
          @click="toggleFormPerm(magicForm, perm.name)"
        >
          {{ perm.name }}
        </button>
      </div>

      <template #actions>
        <button class="save-btn" :disabled="saving || !magicForm.name" @click="saveMagic">保存</button>
        <button class="cancel-btn" @click="magicDialogOpen = false">キャンセル</button>
        <button v-if="magicEditingId" class="delete-btn" :disabled="deleting" @click="showConfirm = true">削除</button>
      </template>
    </FormDialog>

    <!-- PCの記入・編集 -->
    <FormDialog v-model="pcDialogOpen" :title="pcEditingId ? 'PCの編集' : 'PCの作成'">
      <label class="edit-label">名前</label>
      <textarea v-model="pcForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">画像</label>
      <p class="markdown-hint">画像アップロードは準備中です</p>

      <label class="edit-label">所属</label>
      <select v-model="pcForm.affiliation" class="edit-input">
        <option value="">(未設定)</option>
        <option v-for="a in allAffiliations ?? []" :key="a.id" :value="a.name">{{ a.name }}</option>
      </select>

      <label class="edit-label">事務所</label>
      <textarea v-model="pcForm.office" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">級</label>
      <select v-model.number="pcForm.grade" class="edit-input">
        <option v-for="g in grades" :key="g" :value="g">{{ g }}級</option>
      </select>

      <template v-if="!pcEditingId">
        <label class="edit-label">初期所持金({{ MONEY_UNIT }})</label>
        <input v-model.number="pcForm.money" type="number" step="1" class="edit-input" />
      </template>

      <label class="check-label">
        <input v-model="pcForm.isRepresentative" type="checkbox" />
        協会の代表
      </label>

      <label class="check-label">
        <input v-model="pcForm.isOfficeRepresentative" type="checkbox" />
        事務所の代表
      </label>

      <label class="check-label">
        <input v-model="pcForm.showTitle" type="checkbox" />
        名前と一緒に肩書きを表示
      </label>

      <label class="check-label">
        <input v-model="pcForm.showOffice" type="checkbox" :disabled="!pcForm.showTitle" />
        肩書きに事務所を表示
      </label>

      <p class="markdown-hint">表示例: {{ pcTitle(formPreview(pcForm)) }}</p>

      <label class="edit-label">メモ</label>
      <textarea v-model="pcForm.memo" class="edit-textarea auto-wrap" rows="3" @input="resize" />
      <p class="markdown-hint">
        # 見出し **太字** ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
      </p>
      <p v-if="pcError" class="error-text">{{ pcError }}</p>

      <template #actions>
        <button class="save-btn" :disabled="pcSaving || !pcForm.name" @click="savePc">保存</button>
        <button class="cancel-btn" @click="pcDialogOpen = false">キャンセル</button>
        <button v-if="pcEditingId" class="delete-btn" :disabled="pcDeleting" @click="showPcConfirm = true">削除</button>
      </template>
    </FormDialog>

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
  font-size: 16px;
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
  flex-shrink: 0;
  white-space: nowrap;
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


.edit-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  font-size: 0.8rem;
  padding: 4px 10px;
  cursor: pointer;
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
  font-size: 16px;
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

/* 外側の一覧は箱にせず、下線付きの見出しとして見せる(内側の項目だけを箱にする) */
.section-accordion {
  margin-bottom: 24px;
}

.section-accordion > :deep(.accordion-item) {
  border: none;
  background: none;
  /* 開いたときの影(AccordionList 側の指定)も付けない */
  box-shadow: none !important;
}

.section-accordion > :deep(.accordion-item) > .accordion-header {
  min-height: 44px;
  padding: 8px 2px;
  border-bottom: 2px solid var(--color-text);
}

@media (hover: hover) {
  .section-accordion > :deep(.accordion-item) > .accordion-header:hover {
    background: none;
    opacity: 0.7;
  }
}

.section-accordion > :deep(.accordion-item) > .detail-outer > .detail-inner {
  border-top: none;
}

.section-accordion :deep(.accordion-title) .section-title {
  font-size: 1rem;
}

.section-count {
  margin-left: 8px;
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.6;
}

.section-body {
  padding: 12px 0 4px;
}

.money-open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-bottom: 16px;
  padding: 12px;
  border: 2px solid #000;
  background: var(--color-accent, #ffd400);
  color: #000;
  font-size: 0.95rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 3px 3px 0 #000;
}

.money-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  padding: 8px 10px;
  border: 1px solid var(--color-text, #000);
}

.money-label {
  font-size: 0.75rem;
  font-weight: bold;
}

.money-value {
  flex: 1;
  font-weight: bold;
}

.money-value.negative {
  color: var(--color-error, #c62828);
}

.money-edit-btn {
  flex-shrink: 0;
  border: 1px solid #000;
  background: var(--color-accent, #ffd400);
  color: #000;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
}


.add-btn {
  margin-top: 12px;
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