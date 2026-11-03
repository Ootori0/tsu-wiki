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
// アカウント設定(ID・パスワードの変更)はふだん閉じておく
const accountOpen = ref(false)
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
  showStats: false,
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
  showStats: !!pc.show_stats,
  stats: Object.fromEntries(STAT_KEYS.map((k) => [k, pc.stats?.[k] ?? ''])),
})

// PCの中のタブ(PCごとに覚える)
const PC_TABS = [
  { value: 'basic', label: '基本' },
  { value: 'items', label: '所持品', count: (pc) => pc.pcItems?.length ?? 0 },
  { value: 'magic', label: '魔法', count: (pc) => magicsOf(pc.id).length },
]
const pcTabs = ref({})
const tabOf = (id) => pcTabs.value[id] ?? 'basic'
const setTab = (id, tab) => {
  pcTabs.value = { ...pcTabs.value, [id]: tab }
  if (tab === 'basic' && isEditing(id)) fitTextareas()
}

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

// --- 所持品(追加・編集はポップアップ。保存するとすぐ反映) ---
const emptyItemForm = () => ({
  name: '', quantity: 1, size: 'small', perSlot: 1, category: 'cargo', effect: '',
  modifiers: Object.fromEntries(STAT_KEYS.map((k) => [k, ''])),
})
const itemDialog = ref({ open: false, pcId: null, itemId: null })
const itemForm = ref(emptyItemForm())
const itemSaving = ref(false)
const showItemConfirm = ref(false)

const openItemCreate = (pcId, category = 'cargo') => {
  itemDialog.value = { open: true, pcId, itemId: null }
  itemForm.value = { ...emptyItemForm(), category }
}

const openItemEdit = (pcId, item) => {
  itemDialog.value = { open: true, pcId, itemId: item.id }
  itemForm.value = {
    name: item.name,
    quantity: item.quantity,
    size: item.size,
    perSlot: item.per_slot,
    category: item.category ?? 'cargo',
    effect: item.effect ?? '',
    modifiers: Object.fromEntries(STAT_KEYS.map((k) => [k, item.modifiers?.[k] ?? ''])),
  }
  fitTextareas()
}

const saveItem = async () => {
  const { pcId, itemId } = itemDialog.value
  if (!itemForm.value.name.trim()) return
  itemSaving.value = true
  try {
    if (itemId) await $fetch(`/api/pc-items/${itemId}`, { method: 'PUT', body: itemForm.value })
    else await $fetch(`/api/pcs/${pcId}/items`, { method: 'POST', body: itemForm.value })
    itemDialog.value.open = false
    await refreshPcsRaw()
    show(itemId ? '所持品を保存しました' : '所持品を追加しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '保存に失敗しました', 'error')
  } finally {
    itemSaving.value = false
  }
}

const deleteItem = async () => {
  const { itemId } = itemDialog.value
  if (!itemId) return
  try {
    await $fetch(`/api/pc-items/${itemId}`, { method: 'DELETE' })
    itemDialog.value.open = false
    await refreshPcsRaw()
    show('所持品を削除しました')
  } catch (e) {
    show(e?.data?.statusMessage ?? '削除に失敗しました', 'error')
  }
}

// 倉庫⇔荷物の出し入れ(チェックを入れると荷物、外すと倉庫)
const togglingItemId = ref(null)
const toggleCargo = async (it, checked) => {
  togglingItemId.value = it.id
  try {
    await $fetch(`/api/pc-items/${it.id}/category`, { method: 'POST', body: { category: checked ? 'cargo' : 'storage' } })
    await refreshPcsRaw()
  } catch (e) {
    show(e?.data?.statusMessage ?? '変更できませんでした', 'error')
  } finally {
    togglingItemId.value = null
  }
}

// 荷物チェッカー: ココフォリアに貼る文章をコピーする
const copyLoadCheck = async (pc) => {
  try {
    await navigator.clipboard.writeText(loadCheckText(pc.name, pc.pcItems))
    show('荷物の一覧をコピーしました')
  } catch {
    show('コピーできませんでした', 'error')
  }
}

// ステータスの表示: 所持品(消耗品以外)の補正があれば「補正後(元の値+補正)」。HP/MPが未入力なら能力値からの目安
const statDisplay = (pc, key) => {
  let base = pc.stats?.[key]
  if (base === undefined || base === '') {
    const d = derivedStats(pc.stats)
    base = key === 'HP' ? d.hp : key === 'MP' ? d.mp : null
  }
  if (base === null || base === undefined) return { value: '-', sub: '' }
  const mod = totalModifiers(pc.pcItems)[key] ?? 0
  return mod ? { value: base + mod, sub: `${base}${formatModifier(mod)}` } : { value: base, sub: '' }
}

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
    <div class="box account-box">
      <button class="account-head" :aria-expanded="accountOpen" @click="accountOpen = !accountOpen">
        <v-icon icon="mdi-account-circle" size="22" />
        <span class="account-name">{{ user?.name }}</span>
        <span v-for="perm in user?.permissions ?? []" :key="perm" class="chip active small">{{ perm }}</span>
        <span class="account-toggle">アカウント設定</span>
        <span class="password-accordion-icon" :class="{ open: accountOpen }">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M8 5l8 7-8 7z" fill="currentColor" />
          </svg>
        </span>
      </button>

      <div class="password-outer" :class="{ open: accountOpen }">
      <div class="password-inner">
      <label class="field-label">ID</label>
      <div class="inline-form">
        <input v-model="newName" class="field-input" />
        <button class="save-btn" :disabled="savingName" @click="saveName">変更</button>
      </div>
      <p v-if="nameError" class="error-text">{{ nameError }}</p>

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
        <!-- 所持金(どのタブでも見える) -->
        <div class="pc-money">
          <span class="money-label">{{ moneyLabel(item) }}</span>
          <span class="money-value" :class="{ negative: item.money < 0 }">{{ formatBalance(item) }}</span>
          <button class="money-edit-btn" @click="openMoneyDialog(item.id)">増減・履歴</button>
        </div>

        <!-- PCの中のタブ: 基本(プロフィール・ステータス) / 所持品 / 魔法 -->
        <div class="pc-tabs" role="tablist">
          <button
            v-for="t in PC_TABS"
            :key="t.value"
            class="pc-tab"
            :class="{ active: tabOf(item.id) === t.value }"
            role="tab"
            :aria-selected="tabOf(item.id) === t.value"
            @click="setTab(item.id, t.value)"
          >
            {{ t.label }}<span v-if="t.count" class="pc-tab-count">{{ t.count(item) }}</span>
          </button>
        </div>

        <template v-if="tabOf(item.id) === 'basic'">
        <!-- このPCの閲覧/編集の切り替え -->
        <!-- 閲覧中は「編集する」ボタン、編集中は「編集中」の帯と「完了」ボタン -->
        <div v-if="!isEditing(item.id)" class="pc-mode-row">
          <span v-if="dirtyIds.includes(item.id)" class="dirty-note inline">未保存の変更あり</span>
          <button class="edit-start-btn" @click="setEditing(item.id, true)">
            <v-icon icon="mdi-pencil" size="16" />編集する
          </button>
        </div>
        <div v-else class="editing-banner">
          <v-icon icon="mdi-pencil" size="16" />
          <span class="editing-banner-text">
            編集中<small>{{ dirtyIds.includes(item.id) ? '変更は左下の「保存」で保存します' : '書き換えると左下に保存ボタンが出ます' }}</small>
          </span>
          <button class="edit-done-btn" @click="setEditing(item.id, false)">完了</button>
        </div>

        <!-- 閲覧モード -->
        <div v-if="!isEditing(item.id)" class="pc-view">
          <p class="meta-line">
            所属: {{ item.affiliation || '-' }} / 事務所: {{ item.office || '-' }} / {{ item.grade }}級<template v-if="pcRoles(item)"> / {{ pcRoles(item) }}</template>
          </p>
          <p class="view-label">ステータス<span class="stats-visibility" :class="{ public: item.show_stats }">{{ item.show_stats ? '公開' : '非公開' }}</span></p>
          <div class="stat-grid">
            <div v-for="k in STAT_KEYS" :key="k" class="stat-cell">
              <span class="stat-key">{{ k }}</span>
              <span class="stat-val">{{ statDisplay(item, k).value }}</span>
              <span v-if="statDisplay(item, k).sub" class="stat-sub">{{ statDisplay(item, k).sub }}</span>
            </div>
          </div>
          <p class="meta-line derived">
            アイデア {{ derivedStats(item.stats).idea ?? '-' }} / 幸運 {{ derivedStats(item.stats).luck ?? '-' }} / 知識 {{ derivedStats(item.stats).know ?? '-' }} / DB {{ derivedStats(item.stats).db }}
          </p>
          <template v-if="item.memo">
            <p class="view-label">メモ</p>
            <MarkdownText :text="item.memo" />
          </template>
          <template v-if="item.items">
            <p class="view-label">持ち物</p>
            <MarkdownText :text="item.items" />
          </template>
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

          <label class="edit-label">ステータス(CoC6版。HP/MPは空欄なら能力値からの目安を表示)</label>
          <div class="stat-grid">
            <label v-for="k in STAT_KEYS" :key="k" class="stat-input">
              <span class="stat-key">{{ k }}</span>
              <input
                v-model.number="drafts[item.id].stats[k]"
                type="number"
                inputmode="numeric"
                :placeholder="k === 'HP' ? String(derivedStats(drafts[item.id].stats).hp ?? '') : k === 'MP' ? String(derivedStats(drafts[item.id].stats).mp ?? '') : ''"
              />
            </label>
          </div>
          <label class="check-label">
            <input v-model="drafts[item.id].showStats" type="checkbox" />
            ステータスをPCタブで公開する
          </label>

          <label class="edit-label">メモ</label>
          <textarea v-model="drafts[item.id].memo" class="edit-textarea auto-wrap" rows="3" @input="resize" />

          <label class="edit-label">持ち物</label>
          <textarea v-model="drafts[item.id].items" class="edit-textarea auto-wrap" rows="2" placeholder="例: 杖、回復薬×2" @input="resize" />
          <p class="markdown-hint">
            # 見出し **太字** ~~取消線~~ `コード` &gt; 引用 ||スポイラー||
          </p>

        </div>

        <div v-if="isEditing(item.id)" class="pc-delete-row">
          <button class="delete-btn pc-delete" :disabled="pcDeleting" @click="requestPcDelete(item.id)">このPCを削除</button>
        </div>
        </template>

        <!-- 所持品・魔法のタブ -->
        <div v-else class="pc-common">


          <!-- 所持品: 装備品・荷物(荷物チェッカー)・倉庫 -->
          <template v-if="tabOf(item.id) === 'items'">
          <div v-for="cat in ITEM_CATEGORIES" :key="cat.value" class="pc-items">
            <div class="sub-head">
              <h3 class="pc-magics-title">
                {{ cat.label }}<span class="section-count">{{ itemsOf(item.pcItems, cat.value).length }}件</span>
              </h3>
              <button class="mini-add" @click="openItemCreate(item.id, cat.value)">＋ 追加</button>
            </div>
            <p class="cat-note">{{ cat.note }}</p>
            <div v-for="it in itemsOf(item.pcItems, cat.value)" :key="it.id" class="pc-item-line">
            <!-- 荷物と倉庫はチェックで出し入れする(チェックあり=荷物) -->
            <label v-if="cat.value !== 'equipment'" class="cargo-check" :title="cat.value === 'cargo' ? '倉庫に戻す' : '荷物に入れる'">
              <input
                type="checkbox"
                :checked="cat.value === 'cargo'"
                :disabled="togglingItemId === it.id"
                :aria-label="cat.value === 'cargo' ? `${it.name}を倉庫に戻す` : `${it.name}を荷物に入れる`"
                @change="toggleCargo(it, $event.target.checked)"
              />
            </label>
            <button class="pc-item-row" @click="openItemEdit(item.id, it)">
              <span class="pc-item-top">
                <span class="pc-item-name">{{ it.name }}<span class="pc-item-qty">×{{ it.quantity }}</span></span>
                <span v-if="it.shop_item_id" class="pc-item-tag">店</span>
                <span v-if="cat.value !== 'equipment'" class="pc-item-cost">{{ it.size === 'none' ? 'なし' : sizeLabel(it.size) }}{{ it.per_slot > 1 ? `(${it.per_slot}個で1つ)` : '' }} / {{ itemCost(it) }}</span>
              </span>
              <span v-if="Object.keys(it.modifiers ?? {}).length" class="pc-item-mods" :class="{ inactive: cat.value !== 'equipment' }">
                {{ modifiersText(it.modifiers) }}<template v-if="cat.value !== 'equipment'">(装備・装飾品にすると反映)</template>
              </span>
              <span v-if="it.effect" class="pc-item-effect">{{ it.effect }}</span>
            </button>
            </div>
            <p v-if="cat.value === 'equipment' && Object.keys(totalModifiers(item.pcItems)).length" class="mods-total">
              補正の合計: {{ modifiersText(totalModifiers(item.pcItems)) }}
            </p>

            <!-- 荷物チェッカー -->
            <div v-if="cat.value === 'cargo'" class="load-check" :class="{ over: totalCost(item.pcItems) > LOAD_LIMIT }">
              <div class="load-head">
                <span>荷物のコスト(大5・中3・小1)</span>
                <strong>{{ totalCost(item.pcItems) }} / {{ LOAD_LIMIT }}</strong>
              </div>
              <div class="load-bar">
                <div class="load-fill" :style="{ width: `${Math.min(100, (totalCost(item.pcItems) / LOAD_LIMIT) * 100)}%` }" />
              </div>
              <p v-if="totalCost(item.pcItems) > LOAD_LIMIT" class="load-over">上限を{{ totalCost(item.pcItems) - LOAD_LIMIT }}超えています</p>
              <button class="copy-btn" @click="copyLoadCheck(item)">ココフォリア用にコピー</button>
            </div>
          </div>

          </template>

          <!-- このPCが所持者の魔法 -->
          <div v-else class="pc-magics">
            <div class="sub-head">
              <h3 class="pc-magics-title">このPCの魔法<span class="section-count">{{ magicsOf(item.id).length }}件</span></h3>
              <button class="mini-add" @click="openMagicCreate(item.id)">＋ 作成</button>
            </div>
            <p v-if="!magicsOf(item.id).length" class="cat-note">まだ魔法がありません</p>
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
          </div>

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

    <!-- 所持品の追加・編集 -->
    <FormDialog
      v-model="itemDialog.open"
      :title="itemDialog.itemId ? '所持品の編集' : '所持品の追加'"
      :save-disabled="itemSaving || !itemForm.name.trim()"
      @save="saveItem"
    >
      <label class="edit-label">名前</label>
      <input v-model="itemForm.name" class="edit-input" />

      <div class="pc-grid">
        <div>
          <label class="edit-label">個数</label>
          <input v-model.number="itemForm.quantity" type="number" min="0" inputmode="numeric" class="edit-input" />
        </div>
        <div>
          <label class="edit-label">大きさ</label>
          <select v-model="itemForm.size" class="edit-input">
            <option v-for="sz in ITEM_SIZES" :key="sz.value" :value="sz.value">{{ sz.label }}({{ sz.points }})</option>
          </select>
        </div>
      </div>
      <label class="edit-label">何個で1つ分の大きさか(例: 御札は10、手榴弾は2)</label>
      <input v-model.number="itemForm.perSlot" type="number" min="1" inputmode="numeric" class="edit-input" />
      <p class="markdown-hint">荷物にしたときのコスト: {{ itemCost({ quantity: itemForm.quantity, per_slot: itemForm.perSlot, size: itemForm.size }) }}</p>

      <label class="edit-label">区分</label>
      <div class="cat-choices">
        <label v-for="cat in ITEM_CATEGORIES" :key="cat.value" class="cat-choice" :class="{ active: itemForm.category === cat.value }">
          <input v-model="itemForm.category" type="radio" :value="cat.value" />
          <span class="cat-choice-label">{{ cat.label }}</span>
          <span class="cat-choice-note">{{ cat.note }}</span>
        </label>
      </div>

      <label class="edit-label">効果</label>
      <textarea v-model="itemForm.effect" class="edit-textarea auto-wrap" rows="2" @input="resize" />

      <label class="edit-label">ステータスへの補正(装備品のときだけ反映。例: STR に 1)</label>
      <div class="stat-grid">
        <label v-for="k in STAT_KEYS" :key="k" class="stat-input">
          <span class="stat-key">{{ k }}</span>
          <input v-model.number="itemForm.modifiers[k]" type="number" inputmode="numeric" />
        </label>
      </div>

      <template v-if="itemDialog.itemId" #extra>
        <button class="delete-btn" @click="showItemConfirm = true">削除</button>
      </template>
    </FormDialog>

    <ConfirmDialog
      v-model="showItemConfirm"
      title="所持品の削除"
      message="この所持品を削除します。よろしいですか?"
      @confirm="deleteItem"
    />

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

/* ---------- ステータス ---------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
}

.stat-cell,
.stat-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid var(--color-text, #000);
  padding: 3px 2px;
  background: var(--color-bg, #fff);
}

.stat-key {
  font-size: 0.65rem;
  font-weight: bold;
  opacity: 0.7;
}

.stat-val {
  font-size: 0.85rem;
  font-weight: bold;
  white-space: nowrap;
}

.stat-sub {
  font-size: 0.62rem;
  color: var(--color-plus, #1b7f2a);
  font-weight: bold;
}

.stat-input input {
  width: 100%;
  border: none;
  padding: 2px;
  text-align: center;
  font-weight: bold;
  box-sizing: border-box;
}

.meta-line.derived {
  margin-top: 6px;
}

/* ---------- 所持品・荷物チェッカー ---------- */
.pc-items {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid var(--color-text, #000);
}

.pc-item-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  border: none;
  border-bottom: 1px solid var(--color-line, rgba(0, 0, 0, 0.14));
  background: none;
  color: var(--color-text, #000);
  padding: 8px 2px;
  cursor: pointer;
}

.pc-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pc-item-name {
  flex: 1;
  font-weight: bold;
  font-size: 0.9rem;
  word-break: break-word;
}

.pc-item-qty {
  margin-left: 4px;
  font-weight: normal;
  font-size: 0.8rem;
}

.pc-item-tag {
  font-size: 0.65rem;
  border: 1px solid currentColor;
  padding: 0 4px;
  opacity: 0.7;
}

.pc-item-cost {
  font-size: 0.75rem;
  white-space: nowrap;
}

.pc-item-mods {
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-plus, #1b7f2a);
}

.pc-item-effect {
  font-size: 0.78rem;
  opacity: 0.75;
  white-space: pre-line;
}

.mods-total {
  margin: 8px 0 0;
  font-size: 0.8rem;
  font-weight: bold;
}

.load-check {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
}

.load-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.8rem;
}

.load-head strong {
  font-size: 1.05rem;
}

.load-bar {
  height: 8px;
  margin: 6px 0;
  border: 1px solid var(--color-text, #000);
  background: var(--color-page, #f6f5ef);
}

.load-fill {
  height: 100%;
  background: var(--color-accent, #ffd400);
  transition: width 0.2s ease;
}

.load-check.over .load-fill {
  background: var(--color-error, #c62828);
}

.load-over {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: bold;
  color: var(--color-error, #c62828);
}

.copy-btn {
  width: 100%;
  border: 1px solid #000;
  background: #000;
  color: var(--color-accent, #ffd400);
  padding: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
}

.pc-item-mods.inactive {
  color: inherit;
  opacity: 0.5;
  font-weight: normal;
}

.add-btn.small {
  padding: 8px;
  font-size: 0.82rem;
}

.cat-choices {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cat-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-text, #000);
  padding: 6px 10px;
  cursor: pointer;
}

.cat-choice.active {
  background: var(--color-accent-soft, #fff7cc);
  border-width: 2px;
}

.cat-choice-label {
  font-weight: bold;
  font-size: 0.9rem;
}

.cat-choice-note {
  font-size: 0.72rem;
  opacity: 0.7;
}

.pc-item-line {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--color-line, rgba(0, 0, 0, 0.14));
}

.pc-item-line .pc-item-row {
  border-bottom: none;
}

.cargo-check {
  display: flex;
  align-items: center;
  padding: 0 8px 0 2px;
  cursor: pointer;
}

/* ---------- アカウント(ふだんは1行) ---------- */
.account-box {
  padding: 0;
}

.account-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: none;
  color: var(--color-text, #000);
  cursor: pointer;
  text-align: left;
}

.account-name {
  font-weight: bold;
  font-size: 1rem;
}

.chip.small {
  padding: 1px 8px;
  font-size: 0.7rem;
}

.account-toggle {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.7;
}

.account-box .password-inner {
  padding: 0 14px;
}

.account-box .password-outer.open .password-inner {
  padding-bottom: 14px;
}

/* ---------- PCの中: 所持金・タブ ---------- */
.pc-money {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 14px 0;
  padding: 8px 10px;
  background: #000;
  color: var(--color-accent, #ffd400);
}

.pc-money .money-label {
  font-size: 0.75rem;
  font-weight: bold;
}

.pc-money .money-value {
  flex: 1;
  font-size: 1.1rem;
  font-weight: bold;
}

.pc-money .money-value.negative {
  color: #ff6b6b;
}

.pc-tabs {
  display: flex;
  margin: 12px 14px 0;
  border-bottom: 2px solid var(--color-text, #000);
}

.pc-tab {
  flex: 1;
  border: none;
  background: none;
  color: var(--color-text, #000);
  padding: 8px 4px;
  font-size: 0.88rem;
  font-weight: bold;
  opacity: 0.55;
  cursor: pointer;
  border-bottom: 4px solid transparent;
  margin-bottom: -2px;
}

.pc-tab.active {
  opacity: 1;
  border-bottom-color: var(--color-accent, #ffd400);
}

.pc-tab-count {
  margin-left: 4px;
  font-size: 0.7rem;
  font-weight: normal;
}

.pc-mode-row {
  align-items: center;
  gap: 8px;
}

.dirty-note.inline {
  margin: 0 auto 0 0;
}

.sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sub-head .pc-magics-title {
  margin: 0;
}

.mini-add {
  flex-shrink: 0;
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: #000;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: bold;
  cursor: pointer;
}

.cat-note {
  display: block;
  margin: 2px 0 4px;
  font-size: 0.7rem;
  opacity: 0.6;
}

.pc-delete-row {
  display: flex;
  justify-content: flex-end;
  padding: 0 14px 14px;
}

.pc-common .pc-items:first-of-type,
.pc-common .pc-magics {
  border-top: none;
}

.pc-common {
  padding-top: 4px;
}

.stats-visibility {
  margin-left: 6px;
  padding: 0 6px;
  font-size: 0.65rem;
  border: 1px solid currentColor;
  opacity: 0.6;
}

.stats-visibility.public {
  opacity: 1;
  background: var(--color-accent, #ffd400);
  border-color: var(--color-text, #000);
}

/* ---------- 編集の開始・終了 ---------- */
.edit-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--color-text, #000);
}

.edit-start-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.editing-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 14px 0;
  padding: 8px 10px;
  background: var(--color-accent, #ffd400);
  border: 1px solid var(--color-text, #000);
  color: #000;
}

.editing-banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  font-weight: bold;
  line-height: 1.3;
}

.editing-banner-text small {
  font-size: 0.68rem;
  font-weight: normal;
}

.edit-done-btn {
  flex-shrink: 0;
  border: 1px solid #000;
  background: #000;
  color: var(--color-accent, #ffd400);
  padding: 6px 16px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
}
</style>
