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
  type: '魔法', name: '', owner: '', ownerPcId: null, tags: [], cost: '', condition: '', effect: '', visiblePermissions: [],
})

// 記入・編集はポップアップで行う(編集中の id が null なら新規作成)
const magicDialogOpen = ref(false)
const magicEditingId = ref(null)
const magicForm = ref(emptyMagicForm())
const saving = ref(false)
const deleting = ref(false)
const showConfirm = ref(false)

// ownerPcId を渡すと、所持者がそのPCの状態で開く(PCの中の「このPCの魔法を作成」)
const openMagicCreate = (ownerPcId = null) => {
  magicEditingId.value = null
  magicForm.value = { ...emptyMagicForm(), ownerPcId: typeof ownerPcId === 'number' ? ownerPcId : null }
  magicDialogOpen.value = true
}

const openMagicEdit = (item) => {
  magicEditingId.value = item.id
  magicForm.value = {
    type: item.type,
    name: item.name,
    owner: item.owner,
    ownerPcId: item.owner_pc_id ?? null,
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
    // 魔法タブの一覧も次に開いたときに読み込み直す
    clearNuxtData('magics-list')
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
    // 魔法タブの一覧も次に開いたときに読み込み直す
    clearNuxtData('magics-list')
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

// 魔法: 「あなたの魔法一覧」にはすべて出し、自分のPCが所持者のものはそのPCの中にも出す
const magicsOf = (pcId) => (fetchedMagics.value ?? []).filter((m) => m.owner_pc_id === pcId)
const magicSection = computed(() => [{ id: 'magics', title: 'あなたの魔法一覧', count: (fetchedMagics.value ?? []).length }])

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
  items: '',
  isRepresentative: false,
  isOfficeRepresentative: false,
  showTitle: true,
  showOffice: true,
})

const refreshPcs = async () => {
  // PCタブの一覧キャッシュも破棄して次回表示時に再取得させる
  clearNuxtData('pcs-list')
  // 魔法の所持者にPC名を出しているので魔法タブの一覧も読み込み直させる
  clearNuxtData('magics-list')
  await refreshPcsRaw()
}

// --- PCの編集: アコーディオンの中でそのまま書き換え、画面左下の「保存」でまとめて保存する ---
const pcToForm = (pc) => ({
  name: pc.name,
  affiliation: pc.affiliation ?? '',
  office: pc.office ?? '',
  grade: pc.grade,
  memo: pc.memo ?? '',
  items: pc.items ?? '',
  isRepresentative: !!pc.is_representative,
  isOfficeRepresentative: !!pc.is_office_representative,
  showTitle: !!pc.show_title,
  showOffice: !!pc.show_office,
})

// 閲覧モード / 編集モード(PCごとに切り替える)
const editingPcIds = ref([])
const isEditing = (id) => editingPcIds.value.includes(id)
const setEditing = (id, editing) => {
  editingPcIds.value = editing
    ? [...new Set([...editingPcIds.value, id])]
    : editingPcIds.value.filter((x) => x !== id)
  if (editing) fitTextareas()
}

// 編集モードのPCのアコーディオンを閉じるときは確認する(OKなら閲覧モードに戻して閉じる)
const closeConfirm = ref({ open: false, pc: null, resolve: null })
const beforeClosePc = (pc) => {
  if (!isEditing(pc.id)) return true
  return new Promise((resolve) => {
    closeConfirm.value = { open: true, pc, resolve }
  })
}
const closeConfirmMessage = computed(() => {
  const pc = closeConfirm.value.pc
  if (!pc) return ''
  return isDirty(pc.id)
    ? `「${pc.name}」の編集を終えて閉じますか?\n保存していない変更は残っているので、左下の保存バーから保存できます。`
    : `「${pc.name}」の編集を終えて閉じますか?`
})
const answerCloseConfirm = (ok) => {
  const { pc, resolve } = closeConfirm.value
  if (ok && pc) setEditing(pc.id, false)
  closeConfirm.value = { open: false, pc: null, resolve: null }
  resolve?.(ok)
}

const drafts = ref({}) // PCのid → 書き換え中の内容
const baselines = ref({}) // PCのid → 書き換える前の内容
const isDirty = (id) => !!drafts.value[id] && JSON.stringify(drafts.value[id]) !== JSON.stringify(baselines.value[id])
const dirtyIds = computed(() => Object.keys(drafts.value).map(Number).filter(isDirty))

// 読み込み直したら、書き換えていないPCは最新の内容に合わせる(書き換え中のものはそのまま残す)
watch(fetchedPcs, async (pcs) => {
  const nextDrafts = {}
  const nextBases = {}
  for (const pc of pcs ?? []) {
    if (isDirty(pc.id)) {
      nextDrafts[pc.id] = drafts.value[pc.id]
      nextBases[pc.id] = baselines.value[pc.id]
    } else {
      nextDrafts[pc.id] = pcToForm(pc)
      nextBases[pc.id] = pcToForm(pc)
    }
  }
  drafts.value = nextDrafts
  baselines.value = nextBases
  if (import.meta.client) fitTextareas()
}, { immediate: true })

onMounted(() => fitTextareas())

const savingDrafts = ref(false)
const saveDrafts = async () => {
  const ids = dirtyIds.value
  const unnamed = ids.find((id) => !drafts.value[id].name.trim())
  if (unnamed) {
    show('名前が空のPCがあります', 'error')
    return
  }
  savingDrafts.value = true
  try {
    for (const id of ids) {
      await $fetch(`/api/pcs/${id}`, { method: 'PUT', body: drafts.value[id] })
      baselines.value[id] = JSON.parse(JSON.stringify(drafts.value[id]))
    }
    await Promise.all([refreshPcs(), refreshMagics()])
    show('PCを保存しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '保存に失敗しました', 'error')
  } finally {
    savingDrafts.value = false
  }
}

const revertDrafts = async () => {
  for (const id of dirtyIds.value) {
    drafts.value[id] = JSON.parse(JSON.stringify(baselines.value[id]))
  }
  fitTextareas()
}

// 保存していない変更があるときは、ページを離れる前に確かめる
onBeforeRouteLeave(() => {
  if (dirtyIds.value.length && !confirm('保存していないPCの変更があります。保存せずに移動しますか?')) return false
})
const warnBeforeUnload = (e) => {
  if (dirtyIds.value.length) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))

// --- PCの新規作成はポップアップ ---
const pcDialogOpen = ref(false)
const pcForm = ref(emptyPcForm())
const pcSaving = ref(false)
const pcError = ref('')

const openPcCreate = () => {
  pcError.value = ''
  pcForm.value = emptyPcForm()
  pcDialogOpen.value = true
}

const savePc = async () => {
  if (!pcForm.value.name) return
  pcError.value = ''
  pcSaving.value = true
  try {
    await $fetch('/api/pcs', { method: 'POST', body: pcForm.value })
    pcDialogOpen.value = false
    await refreshPcs()
    show('PCを作成しました')
  } catch (e) {
    pcError.value = e?.data?.statusMessage ?? '保存に失敗しました'
  } finally {
    pcSaving.value = false
  }
}

// --- PCの削除 ---
const pcDeleting = ref(false)
const showPcConfirm = ref(false)
const pendingPcDeleteId = ref(null)
const requestPcDelete = (id) => {
  pendingPcDeleteId.value = id
  showPcConfirm.value = true
}

const confirmPcDelete = async () => {
  const id = pendingPcDeleteId.value
  if (!id) return
  pcDeleting.value = true
  try {
    await $fetch(`/api/pcs/${id}`, { method: 'DELETE' })
    await Promise.all([refreshPcs(), refreshMagics()])
    show('PCを削除しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '削除に失敗しました', 'error')
  } finally {
    pcDeleting.value = false
    pendingPcDeleteId.value = null
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

    <!-- 自分のPC: PCごとに一番外のアコーディオン。編集モードでは中でそのまま書き換え、画面左下の「保存」で保存する -->
    <div class="pc-heading">
      <h2 class="pc-heading-title">あなたのPC</h2>
    </div>
    <p v-if="!myPcItems.length" class="empty">まだPCがありません</p>
    <AccordionList :items="myPcItems" title-key="title" multiple :before-close="beforeClosePc" class="pc-list">
      <template #title="{ item }">
        <span>{{ item.title }}</span>
        <span v-if="isEditing(item.id)" class="editing-mark">編集中</span>
        <span v-if="dirtyIds.includes(item.id)" class="dirty-mark">未保存</span>
      </template>
      <template #detail="{ item }">
        <!-- このPCの閲覧/編集の切り替え -->
        <div class="pc-mode-row">
          <div class="mode-switch" role="group" aria-label="表示の切り替え">
            <button class="mode-btn" :class="{ active: !isEditing(item.id) }" @click="setEditing(item.id, false)">閲覧</button>
            <button class="mode-btn" :class="{ active: isEditing(item.id) }" @click="setEditing(item.id, true)">編集</button>
          </div>
        </div>

        <!-- 閲覧モード -->
        <div v-if="!isEditing(item.id)" class="pc-view">
          <p class="meta-line">
            所属: {{ item.affiliation || '-' }} / 事務所: {{ item.office || '-' }} / {{ item.grade }}級<template v-if="pcRoles(item)"> / {{ pcRoles(item) }}</template>
          </p>
          <template v-if="item.memo">
            <p class="view-label">メモ</p>
            <MarkdownText :text="item.memo" />
          </template>
          <template v-if="item.items">
            <p class="view-label">持ち物</p>
            <MarkdownText :text="item.items" />
          </template>
          <p v-if="dirtyIds.includes(item.id)" class="dirty-note">保存していない変更があります(編集モードで確認できます)</p>
        </div>

        <!-- 編集モード -->
        <div v-else-if="drafts[item.id]" class="pc-edit">
          <label class="edit-label">名前</label>
          <textarea v-model="drafts[item.id].name" class="edit-input auto-wrap" rows="1" @input="resize" />

          <div class="pc-grid">
            <div>
              <label class="edit-label">所属</label>
              <select v-model="drafts[item.id].affiliation" class="edit-input">
                <option value="">(未設定)</option>
                <option v-for="a in allAffiliations ?? []" :key="a.id" :value="a.name">{{ a.name }}</option>
              </select>
            </div>
            <div>
              <label class="edit-label">級</label>
              <select v-model.number="drafts[item.id].grade" class="edit-input">
                <option v-for="g in grades" :key="g" :value="g">{{ g }}級</option>
              </select>
            </div>
          </div>

          <label class="edit-label">事務所</label>
          <textarea v-model="drafts[item.id].office" class="edit-input auto-wrap" rows="1" @input="resize" />

          <div class="check-grid">
            <label class="check-label">
              <input v-model="drafts[item.id].isRepresentative" type="checkbox" />
              協会の代表
            </label>
            <label class="check-label">
              <input v-model="drafts[item.id].isOfficeRepresentative" type="checkbox" />
              事務所の代表
            </label>
            <label class="check-label">
              <input v-model="drafts[item.id].showTitle" type="checkbox" />
              名前と一緒に肩書きを表示
            </label>
            <label class="check-label">
              <input v-model="drafts[item.id].showOffice" type="checkbox" :disabled="!drafts[item.id].showTitle" />
              肩書きに事務所を表示
            </label>
          </div>
          <p class="markdown-hint">表示例: {{ pcTitle(formPreview(drafts[item.id])) }}</p>

          <label class="edit-label">メモ</label>
          <textarea v-model="drafts[item.id].memo" class="edit-textarea auto-wrap" rows="3" @input="resize" />

          <label class="edit-label">持ち物</label>
          <textarea v-model="drafts[item.id].items" class="edit-textarea auto-wrap" rows="2" placeholder="例: 杖、回復薬×2" @input="resize" />
          <p class="markdown-hint">
            # 見出し **太字** ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
          </p>

        </div>

        <!-- 所持金とこのPCの魔法(閲覧・編集のどちらでも出す) -->
        <div class="pc-common">
          <div class="money-row">
            <span class="money-label">{{ moneyLabel(item) }}</span>
            <span class="money-value" :class="{ negative: item.money < 0 }">{{ formatBalance(item) }}</span>
            <button class="money-edit-btn" @click="openMoneyDialog(item.id)">増減・履歴</button>
          </div>

          <!-- このPCが所持者の魔法 -->
          <div class="pc-magics">
            <h3 class="pc-magics-title">このPCの魔法<span class="section-count">{{ magicsOf(item.id).length }}件</span></h3>
            <AccordionList :items="magicsOf(item.id)" title-key="name" class="ruled-list">
              <template #detail="{ item: magic }">
                <div class="view-mode">
                  <p class="meta-line">区分: {{ magic.type }}</p>
                  <p class="meta-line">コスト: {{ magic.cost || '-' }} / 発動条件: {{ magic.condition || '-' }}</p>
                  <MarkdownText :text="magic.effect" />
                  <button class="edit-btn" @click="openMagicEdit(magic)">編集</button>
                </div>
              </template>
            </AccordionList>
            <button class="add-btn" @click="openMagicCreate(item.id)">＋ このPCの魔法を作成</button>
          </div>

          <button v-if="isEditing(item.id)" class="delete-btn pc-delete" :disabled="pcDeleting" @click="requestPcDelete(item.id)">このPCを削除</button>
        </div>
      </template>
    </AccordionList>
    <button class="add-btn" @click="openPcCreate">＋ PCを作成</button>

    <!-- 自分の魔法一覧(表示はアコーディオン、記入・編集はポップアップ) -->
    <AccordionList :items="magicSection" class="section-accordion">
      <template #title="{ item }">
        <span class="section-title">{{ item.title }}</span>
        <span class="section-count">{{ item.count }}件</span>
      </template>
      <template #detail>
        <div class="section-body">
          <p v-if="!(fetchedMagics ?? []).length" class="empty">まだ魔法がありません</p>
          <AccordionList :items="fetchedMagics ?? []" title-key="name" class="ruled-list">
            <template #detail="{ item }">
              <div class="view-mode">
                <p class="meta-line">区分: {{ item.type }} / 所持者: {{ item.owner_pc_name || item.owner || '-' }}</p>
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

    <!-- 保存していないPCの変更があるときだけ、画面左下に出す -->
    <Transition name="save-bar">
      <div v-if="dirtyIds.length" class="save-bar" role="status">
        <span class="save-bar-text">未保存の変更</span>
        <button class="save-bar-btn" :disabled="savingDrafts" @click="revertDrafts">戻す</button>
        <button class="save-bar-btn primary" :disabled="savingDrafts" @click="saveDrafts">保存</button>
      </div>
    </Transition>

    <!-- 魔法の記入・編集 -->
    <FormDialog
      v-model="magicDialogOpen"
      :title="magicEditingId ? '魔法の編集' : '魔法の作成'"
      :save-disabled="saving || !magicForm.name"
      @save="saveMagic"
    >
      <label class="edit-label">区分</label>
      <select v-model="magicForm.type" class="edit-input">
        <option v-for="t in magicTypes" :key="t" :value="t">{{ t }}</option>
      </select>

      <label class="edit-label">名称</label>
      <textarea v-model="magicForm.name" class="edit-input auto-wrap" rows="1" @input="resize" />

      <label class="edit-label">所持者</label>
      <select v-model="magicForm.ownerPcId" class="edit-input">
        <option :value="null">自由記述</option>
        <option v-for="pc in fetchedPcs ?? []" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
      </select>
      <textarea
        v-if="magicForm.ownerPcId === null"
        v-model="magicForm.owner"
        class="edit-input auto-wrap"
        rows="1"
        placeholder="所持者を自由に記入"
        @input="resize"
      />

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

      <template v-if="magicEditingId" #extra>
        <button class="delete-btn" :disabled="deleting" @click="showConfirm = true">削除</button>
      </template>
    </FormDialog>

    <!-- PCの記入・編集 -->
    <FormDialog
      v-model="pcDialogOpen"
      title="PCの作成"
      :save-disabled="pcSaving || !pcForm.name"
      @save="savePc"
    >
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

      <label class="edit-label">初期所持金({{ MONEY_UNIT }})</label>
      <input v-model.number="pcForm.money" type="number" step="1" class="edit-input" />

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

      <label class="edit-label">持ち物</label>
      <textarea v-model="pcForm.items" class="edit-textarea auto-wrap" rows="2" @input="resize" />
      <p class="markdown-hint">
        # 見出し **太字** ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
      </p>
      <p v-if="pcError" class="error-text">{{ pcError }}</p>
    </FormDialog>

    <ConfirmDialog
      v-model="showConfirm"
      title="魔法の削除"
      message="この魔法を削除します。この操作は取り消せません。よろしいですか?"
      @confirm="confirmDelete"
    />

    <ConfirmDialog
      :model-value="closeConfirm.open"
      title="編集を終える"
      confirm-label="閉じる"
      :danger="false"
      :message="closeConfirmMessage"
      @confirm="answerCloseConfirm(true)"
      @cancel="answerCloseConfirm(false)"
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
  /* 下は画面左下の保存バーに隠れないよう広めに空ける */
  padding: 72px 16px 96px;
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


.delete-btn {
  border: 1px solid #c00;
  background: var(--color-bg, #fff);
  color: #c00;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
}

/* 外側の一覧は箱、内側の項目は罫線で区切った行として見せる */
.section-accordion {
  margin: 24px 0 16px;
}

.section-accordion :deep(.accordion-title) .section-title {
  font-size: 1rem;
}

.ruled-list {
  gap: 0;
}

.ruled-list > :deep(.accordion-item) {
  border: none;
  border-bottom: 1px solid var(--color-text);
  background: none;
  /* 開いたときの影(AccordionList 側の指定)も付けない */
  box-shadow: none !important;
}

.ruled-list > :deep(.accordion-item):first-child {
  border-top: 1px solid var(--color-text);
}

.ruled-list > :deep(.accordion-item) > .accordion-header {
  padding: 10px 4px;
}

.ruled-list > :deep(.accordion-item) > .detail-outer > .detail-inner {
  border-top: none;
}

.ruled-list :deep(.view-mode) {
  padding: 0 4px 14px;
}

.section-count {
  margin-left: 8px;
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.6;
}

.section-body {
  padding: 12px;
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

/* ---------- PC(一番外のアコーディオン。中でそのまま編集) ---------- */
.pc-list {
  margin-bottom: 4px;
}

.dirty-mark {
  margin-left: 8px;
  padding: 0 6px;
  font-size: 0.68rem;
  font-weight: bold;
  background: var(--color-accent, #ffd400);
  border: 1px solid var(--color-text, #000);
  vertical-align: middle;
}

.pc-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 14px;
}

.pc-edit .edit-label {
  margin-top: 4px;
}

.pc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pc-grid > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.check-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.pc-magics {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid var(--color-text, #000);
}

.pc-magics-title {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.pc-delete {
  align-self: flex-end;
  margin-top: 16px;
}

/* ---------- 画面左下の保存バー ---------- */
.save-bar {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 14px;
  background: #000;
  color: var(--color-accent, #ffd400);
  box-shadow: 4px 4px 0 var(--color-accent, #ffd400);
  max-width: calc(100vw - 32px);
}

.save-bar-text {
  font-size: 0.85rem;
  font-weight: bold;
  margin-right: 4px;
}

.save-bar-btn {
  border: 1px solid var(--color-accent, #ffd400);
  background: transparent;
  color: var(--color-accent, #ffd400);
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
}

.save-bar-btn.primary {
  background: var(--color-accent, #ffd400);
  color: #000;
}

.save-bar-btn:disabled {
  opacity: 0.5;
}

.save-bar-enter-active,
.save-bar-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.save-bar-enter-from,
.save-bar-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* ---------- あなたのPC: 見出しと閲覧/編集の切り替え ---------- */
.pc-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 24px 0 10px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--color-text, #000);
}

.pc-heading-title {
  margin: 0;
  font-size: 1rem;
}

.mode-switch {
  display: flex;
  border: 1px solid var(--color-text, #000);
}

.mode-btn {
  border: none;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 5px 14px;
  font-size: 0.82rem;
  cursor: pointer;
}

.mode-btn + .mode-btn {
  border-left: 1px solid var(--color-text, #000);
}

.mode-btn.active {
  background: var(--color-text, #000);
  color: var(--color-accent, #ffd400);
  font-weight: bold;
}

.pc-mode-row {
  display: flex;
  justify-content: flex-end;
  padding: 10px 14px 0;
}

.editing-mark {
  margin-left: 8px;
  padding: 0 6px;
  font-size: 0.68rem;
  font-weight: bold;
  background: #000;
  color: var(--color-accent, #ffd400);
  vertical-align: middle;
}

.pc-view {
  padding: 8px 14px 0;
}

.view-label {
  margin: 10px 0 2px;
  font-size: 0.75rem;
  font-weight: bold;
}

.dirty-note {
  margin: 8px 0 0;
  font-size: 0.78rem;
  font-weight: bold;
  color: var(--color-error, #c62828);
}

.pc-common {
  display: flex;
  flex-direction: column;
  padding: 0 14px 14px;
}
</style>
