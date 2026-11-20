<script setup>
// カジノの「Showdown」(魔術《Showdown》を元にした、ディーラーとの MP の削り合い)
// サーバーが返す「起きたこと(events)」を1つずつ再生して、札・MP・ログを動かす
const { refreshMyPcs, selectedPcId, selectedPc } = await useMyPcs()

const { data: state, refresh: refreshState } = await useFetch('/api/casino/showdown/state', {
  key: 'showdown-state',
  query: computed(() => ({ pcId: selectedPcId.value })),
  immediate: !!selectedPcId.value,
  watch: [selectedPcId],
})

const PUBLIC = 4
// 卓の段: 上が伏せ札(枠 4〜6)、下が公開札(枠 0〜3)
const ROWS = [
  { label: '伏せ札', slots: [4, 5, 6] },
  { label: '公開札', slots: [0, 1, 2, 3] },
]
const settings = computed(() => state.value?.settings ?? null)
const game = computed(() => state.value?.game ?? null)
const finished = ref(null) // 終わった直後の勝負(次の勝負を始めるまで結果を見せる)
const remainingPlays = computed(() => Math.max(0, (settings.value?.dailyLimit ?? 0) - (state.value?.playsToday ?? 0)))
const handOf = (key) => SHOWDOWN_HANDS.find((h) => h.key === key) ?? SHOWDOWN_HANDS[0]
const handLabelOf = (key) => handOf(key).label
const dice = (d) => (d ? `${d.count}d${d.sides}` : '')
const LEVEL_LABELS = ['失敗', '通常成功', 'ハード成功', 'イクストリーム成功']

// --- 表示の状態 ---
const emptySlot = () => ({ card: null, up: false, dealt: false, torn: false, tearing: false, used: false, checked: false })
const slots = ref(Array.from({ length: 7 }, emptySlot))
const declared = ref(null)
const mp = ref({ player: null, dealer: null })
const floats = ref([]) // MP の横に浮かぶ数字 { id, who, text, cls }
// ダイスの表示(卓の下): 判定の d100 か、ダメージのダイス
// { type: 'check', who, skill, value, target, level, upgraded, done } / { type: 'damage', label, dice: [{ v, rolling }], total, note, done }
const stage = ref(null)
const verdict = ref(null)
const logs = ref([]) // { id, text, cls }
const animating = ref(false)
const busy = ref(false)
const locked = computed(() => busy.value || animating.value)
const errorMessage = ref('')
const raiseMode = ref(false)
const logBox = ref(null)
const tableEl = ref(null)

let reduceMotion = false
onMounted(() => {
  reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
})
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms))

let seq = 0
const log = (text, cls = '') => {
  logs.value = [...logs.value, { id: ++seq, text, cls }].slice(-80)
  nextTick(() => {
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight
  })
}
const float = (who, text, cls) => {
  const id = ++seq
  floats.value = [...floats.value, { id, who, text, cls }]
  setTimeout(() => {
    floats.value = floats.value.filter((f) => f.id !== id)
  }, 1200)
}

// 進行中の勝負をアニメーションなしで並べる
const syncStatic = (g) => {
  verdict.value = null
  if (!g) {
    slots.value = Array.from({ length: 7 }, emptySlot)
    declared.value = null
    mp.value = { player: null, dealer: null }
    return
  }
  slots.value = Array.from({ length: 7 }, (_, i) => {
    const present = i < PUBLIC ? !!g.publicCards[i] : g.hiddenPresent[i - PUBLIC]
    return { ...emptySlot(), card: i < PUBLIC ? g.publicCards[i] : null, dealt: present, up: i < PUBLIC && present, torn: !present }
  })
  declared.value = g.declared
  mp.value = { player: g.playerMp, dealer: g.dealerMp }
}
watch(game, (g) => {
  if (animating.value) return
  if (g) syncStatic(g)
  else if (!finished.value) syncStatic(null)
}, { immediate: true })
watch(selectedPcId, () => {
  finished.value = null
  logs.value = []
})

// --- 起きたことを1つずつ再生する ---
const WHO = { player: 'あなた', dealer: 'ディーラー' }
const ACTION_LABELS = { call: 'Call(勝負)', raise: 'Raise(札を攻撃)', check: 'Check(通常攻撃)' }
const DEALER_ACTION_LABELS = { raise: 'Raise(自分の札を破る)', check: 'Check(通常攻撃)' }

const setMp = (who, value) => {
  mp.value = { ...mp.value, [who]: value }
}
// 役に使った札を光らせる順: ペアの役(ワンペア・ツーペア)は2枚ずつ、それ以外は1枚ずつ
const roleGroups = (handKey, cards) => {
  const byTwo = handKey === 'one_pair' || handKey === 'two_pair'
  const out = []
  for (let k = 0; k < cards.length; k += byTwo ? 2 : 1) out.push(cards.slice(k, k + (byTwo ? 2 : 1)))
  return out
}
const mark = (cards, cls) => {
  slots.value = slots.value.map((s) => ({ ...s, [cls]: s[cls] || (!!s.card && cards.includes(s.card)) }))
}

const play = async (e) => {
  switch (e.t) {
    case 'turn':
      log(`― ${WHO[e.who]}のターン ―`, 'turn')
      await wait(250)
      break
    case 'cost':
      setMp(e.who, e.mp)
      float(e.who, `-${e.amount}`, 'cost')
      log(`${WHO[e.who]}は${e.why}で MP ${e.amount} を使った`, 'cost')
      await wait(400)
      break
    case 'flop': {
      if (slots.value.some((s) => s.dealt || s.torn)) {
        slots.value = slots.value.map((s) => ({ ...s, dealt: false, used: false, checked: false }))
        await wait(300)
      }
      verdict.value = null
      slots.value = Array.from({ length: 7 }, (_, i) => ({ ...emptySlot(), card: i < PUBLIC ? e.public[i] : null }))
      for (const i of [4, 5, 6, 0, 1, 2, 3]) {
        slots.value[i].dealt = true
        await wait(110)
      }
      await wait(150)
      for (let i = 0; i < PUBLIC; i++) {
        slots.value[i].up = true
        await wait(220)
      }
      log('ディーラーが7枚の札を配った')
      break
    }
    case 'declare':
      declared.value = e.hand
      log(`ディーラーの宣言${e.reason === 'flop' ? '' : '(し直し)'}: ${handLabelOf(e.hand)}`, 'declare')
      await wait(550)
      break
    case 'action':
      log(`${WHO[e.who]}: ${(e.who === 'player' ? ACTION_LABELS : DEALER_ACTION_LABELS)[e.action]}`, `action ${e.who}`)
      await wait(300)
      break
    case 'roll': {
      // d100 を転がしてから止め、成功強度を出す
      stage.value = { type: 'check', who: e.who, skill: e.skill, value: null, target: settings.value?.skill ?? 85, level: null, upgraded: false, done: false }
      for (let f = 0; f < 9; f++) {
        stage.value.value = 1 + Math.floor(Math.random() * 100)
        await wait(55)
      }
      stage.value = { ...stage.value, value: e.value, level: e.level, upgraded: e.upgraded, done: true }
      log(`${WHO[e.who]}の${e.skill}: ${e.value} / ${settings.value?.skill ?? 85} → ${LEVEL_LABELS[e.level]}${e.upgraded ? '(ストレートの効果でイクストリーム)' : ''}`, `roll level${e.level}`)
      await wait(800)
      break
    }
    case 'miss':
      stage.value = { type: 'text', text: `${WHO[e.who]}の${e.kind}は外れた` }
      log(`${WHO[e.who]}の${e.kind}は外れた`, 'miss')
      await wait(600)
      break
    case 'hit': {
      const parts = []
      if (e.reduces?.length > 1) parts.push(`軽減 ${e.reduces.map((r) => `${r}%`).join(' → ')}`)
      else if (e.reduce) parts.push(`軽減 ${e.reduce}%`)
      if (e.armor) parts.push(`装甲 ${e.armor}`)
      await rollDamage(`${WHO[e.target]}へのダメージ(${e.kind})`, e.dice ?? [], e.kind === '反撃' ? 13 : 10, e.raw, parts.join(' / '), e.damage)
      setMp(e.target, e.mp)
      float(e.target, `-${e.damage}`, 'damage')
      log(`${WHO[e.target]}に ${e.damage} ダメージ(${(e.dice ?? []).join('+')} = ${e.raw}${parts.length ? ` / ${parts.join(' / ')}` : ''})`, `hit ${e.target}`)
      await wait(700)
      break
    }
    case 'card_hit':
      await rollDamage('札へのダメージ(Raise)', e.dice, 10, e.raw, e.broken.length ? `${e.broken.length}枚破れる` : '13に届かず破れない', null)
      log(`札に ${e.raw} ダメージ(${e.dice.join('+')})→ ${e.broken.length ? `${e.broken.length}枚破れる` : '13に届かず破れない'}`)
      await wait(600)
      break
    case 'tear':
      for (const i of e.slots) slots.value[i].tearing = true
      await wait(520)
      for (const i of e.slots) slots.value[i] = { ...emptySlot(), torn: true }
      log(e.by === 'player' ? `札が${e.slots.length}枚破れた` : `ディーラーが自分の札を${e.slots.length}枚破った`)
      await wait(200)
      break
    case 'river':
    case 'redraw': {
      const shown = e.t === 'river' ? e.public : e.cards
      for (const i of e.slots) {
        slots.value[i] = { ...emptySlot(), card: shown[i] ?? null }
        await wait(40)
        slots.value[i].dealt = true
        await wait(200)
        if (shown[i]) slots.value[i].up = true
        await wait(260)
      }
      log(`ディーラーが破れた札を${e.slots.length}枚引き直した`)
      break
    }
    case 'reveal':
      for (let j = 0; j < 3; j++) {
        const i = PUBLIC + j
        if (!e.hidden[j]) continue
        slots.value[i].card = e.hidden[j]
        await wait(60)
        slots.value[i].up = true
        await wait(380)
      }
      log('ディーラーが伏せ札を開いた')
      break
    case 'check':
      mark(e.cards, 'checked')
      verdict.value = { bluff: e.bluff, actual: e.actual }
      log(e.bluff ? `嘘! 実際は${handLabelOf(e.actual)}(宣言は${handLabelOf(e.declared)})` : `宣言どおり(${handLabelOf(e.actual)})`, e.bluff ? 'bluff' : 'truth')
      await wait(1000)
      slots.value = slots.value.map((s) => ({ ...s, checked: false }))
      break
    case 'final':
      for (const grp of roleGroups(e.hand, e.cards)) {
        mark(grp, 'used')
        await wait(420)
      }
      log(`7枚の役: ${handLabelOf(e.hand)}`)
      await wait(250)
      break
    case 'discard':
      await wait(400)
      slots.value = slots.value.map((s) => ({ ...s, dealt: false, used: false, checked: false, torn: false }))
      declared.value = null
      verdict.value = null
      log('場の札を捨てた(バフが消える)')
      await wait(350)
      break
    case 'note':
      log(e.text)
      await wait(300)
      break
    case 'resign':
      log('あなたは投了した', 'miss')
      setMp('player', 0)
      await wait(300)
      break
    case 'end':
      log(`MP: あなた ${e.playerMp} / ディーラー ${e.dealerMp} で終了`, 'turn')
      await wait(300)
      break
  }
}

// ダメージのダイスを1つずつ転がして止め、合計と軽減後のダメージを出す
// dice: 出た目の並び(役のバフは '+6' のような文字で入っている)
const rollDamage = async (label, dice, sides, total, note, damage) => {
  stage.value = { type: 'damage', label, dice: dice.map((v) => ({ v: typeof v === 'number' ? null : v, rolling: false })), total: null, note: '', damage: null, done: false }
  for (let k = 0; k < dice.length; k++) {
    if (typeof dice[k] !== 'number') continue
    stage.value.dice[k].rolling = true
    for (let f = 0; f < 5; f++) {
      stage.value.dice[k].v = 1 + Math.floor(Math.random() * sides)
      await wait(45)
    }
    stage.value.dice[k] = { v: dice[k], rolling: false }
    await wait(90)
  }
  await wait(150)
  stage.value = { ...stage.value, total, note, damage, done: true }
  await wait(250)
}

// 操作を送り、返ってきた events を再生してから、所持金と状態を読み込み直す
const run = async (fn) => {
  busy.value = true
  animating.value = true
  errorMessage.value = ''
  try {
    const res = await fn()
    busy.value = false
    for (const e of res.events) await play(e)
    if (res.game.status !== 'playing') finished.value = res.game
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage ?? '通信に失敗しました'
    if (game.value) syncStatic(game.value)
  } finally {
    busy.value = false
    animating.value = false
    await Promise.all([refreshState(), refreshMyPcs()])
  }
}

const start = () => run(() => {
  // 卓を画面の上に合わせ、卓から操作ボタンまでを1画面で見られるようにする
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  tableEl.value?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  finished.value = null
  raiseMode.value = false
  logs.value = []
  stage.value = null
  mp.value = { player: settings.value?.playerMp ?? null, dealer: settings.value?.dealerMp ?? null }
  return $fetch('/api/casino/showdown/start', { method: 'POST', body: { pcId: selectedPcId.value } })
})
const act = (action, slot) => run(() => {
  raiseMode.value = false
  return $fetch('/api/casino/showdown/action', { method: 'POST', body: { gameId: game.value.id, action, slot } })
})
const onCardClick = (i) => {
  if (!raiseMode.value || !slots.value[i].card || locked.value || i >= PUBLIC) return
  act('raise', i)
}
const showResign = ref(false)

const buff = computed(() => (declared.value ? handBuff(declared.value) : null))
const mpPercent = (who) => {
  const max = who === 'player' ? settings.value?.playerMp : settings.value?.dealerMp
  return max ? Math.max(0, Math.min(100, ((mp.value[who] ?? 0) / max) * 100)) : 0
}
const canStart = computed(() => !!selectedPc.value && !game.value && remainingPlays.value > 0 && !locked.value)
const RESULT_LABELS = { win: 'あなたの勝ち', lose: 'ディーラーの勝ち', push: '引き分け', fold: '投了' }
</script>

<template>
  <section class="game showdown">
    <h2 class="game-title">Showdown</h2>
    <p class="game-rule">
      ディーラーと MP を削り合います。どちらかの MP が0を下回ったら終わり、MP の差 × {{ formatMoney(settings?.rate ?? 0) }}を精算します。
    </p>
    <p v-if="settings?.dealerPcName" class="dealer-info">ディーラー: <strong>{{ settings.dealerPcName }}</strong></p>

    <!-- 卓 -->
    <div ref="tableEl" class="table">
      <div class="declare">
        <Transition name="declare" mode="out-in">
          <div v-if="declared" :key="declared" class="declare-inner">
            <span class="declare-label">ディーラーの宣言</span>
            <strong class="declare-hand">{{ handLabelOf(declared) }}</strong>
            <span v-if="buff" class="buff">
              回避 +{{ Math.round(buff.dodgeBonus * 100) }}% / 攻撃 +({{ buff.mult }}d13)÷2<template v-if="handOf(declared).effect"> / {{ handOf(declared).effect }}</template>
            </span>
          </div>
          <span v-else-if="!game && !animating" key="idle" class="declare-idle">「勝負を始める」でディーラーが札を配ります</span>
          <span v-else key="wait" class="declare-idle">…</span>
        </Transition>
      </div>

      <div class="cards">
        <div v-for="row in ROWS" :key="row.label" class="card-group">
          <span class="group-label">{{ row.label }}</span>
          <div class="card-row">
            <div
              v-for="i in row.slots"
              :key="i"
              class="slot"
              :class="{
                dealt: slots[i].dealt,
                tearing: slots[i].tearing,
                torn: slots[i].torn,
                target: raiseMode && i < PUBLIC && slots[i].card,
                used: slots[i].used,
                checked: slots[i].checked,
              }"
            >
              <span v-if="slots[i].torn" class="torn-mark">破れ</span>
              <span v-else class="deal">
                <button
                  class="card3d"
                  :class="{ up: slots[i].up }"
                  :disabled="!(raiseMode && i < PUBLIC && slots[i].card) || locked"
                  :aria-label="slots[i].up && slots[i].card ? `${cardFace(slots[i].card).suit}${cardFace(slots[i].card).label}` : '伏せ札'"
                  @click="onCardClick(i)"
                >
                  <span class="face front" :class="{ red: cardFace(slots[i].card)?.red, joker: cardFace(slots[i].card)?.joker }">
                    <template v-if="slots[i].card">
                      <span class="card-num">{{ cardFace(slots[i].card).label }}</span>
                      <span class="card-suit">{{ cardFace(slots[i].card).suit }}</span>
                    </template>
                  </span>
                  <span class="face back" />
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ダイス(行を固定して、振る前後で位置が動かないようにする) -->
      <div class="stage" aria-live="polite">
        <template v-if="stage?.type === 'check'">
          <span class="stage-label">{{ WHO[stage.who] }}の{{ stage.skill }}</span>
          <span class="stage-dice">
            <span class="d100" :class="{ rolling: !stage.done }">{{ stage.value ?? '--' }}</span>
            <span class="stage-target">/ {{ stage.target }}</span>
          </span>
          <span class="stage-result">
            <Transition name="pop">
              <span v-if="stage.done" class="level" :class="`level${stage.level}`">
                {{ LEVEL_LABELS[stage.level] }}<small v-if="stage.upgraded">(ストレートで昇格)</small>
              </span>
            </Transition>
          </span>
        </template>
        <template v-else-if="stage?.type === 'damage'">
          <span class="stage-label">{{ stage.label }}</span>
          <span class="stage-dice dice-faces">
            <span v-for="(d, k) in stage.dice" :key="k" class="die" :class="{ rolling: d.rolling, waiting: d.v === null, bonus: typeof d.v === 'string' }">{{ d.v ?? '?' }}</span>
          </span>
          <span class="stage-result">
            <Transition name="pop">
              <span v-if="stage.done" class="dmg-total">
                = {{ stage.total }}<template v-if="stage.note"> / {{ stage.note }}</template>
                <template v-if="stage.damage !== null"> → <strong>{{ stage.damage }}</strong></template>
              </span>
            </Transition>
          </span>
        </template>
        <span v-else-if="stage" class="stage-label stage-text">{{ stage.text }}</span>
        <span v-else class="stage-label stage-text stage-idle">ダイス</span>
      </div>

      <Transition name="pop">
        <p v-if="verdict" class="verdict" :class="{ bluff: verdict.bluff }">
          <template v-if="verdict.bluff">嘘! 実際は<strong>{{ handLabelOf(verdict.actual) }}</strong></template>
          <template v-else>宣言どおり(<strong>{{ handLabelOf(verdict.actual) }}</strong>)</template>
        </p>
      </Transition>
    </div>

    <!-- MP(盤面の下) -->
    <div v-if="mp.player !== null" class="mp-board">
      <div v-for="who in ['dealer', 'player']" :key="who" class="mp-row">
        <span class="mp-name">{{ who === 'player' ? 'あなた' : 'ディーラー' }}</span>
        <div class="mp-bar" :class="{ low: mpPercent(who) < 25 }">
          <div class="mp-fill" :class="who" :style="{ width: `${mpPercent(who)}%` }" />
        </div>
        <span class="mp-value">{{ mp[who] }}</span>
        <span class="floats">
          <span v-for="f in floats.filter((x) => x.who === who)" :key="f.id" class="float" :class="f.cls">{{ f.text }}</span>
        </span>
      </div>
    </div>

    <!-- 結果 -->
    <Transition name="result">
      <div v-if="finished && !animating" class="result" :class="finished.status">
        <p class="result-title">{{ RESULT_LABELS[finished.status] }}</p>
        <p class="result-line">
          MP: あなた {{ finished.playerMp }} − ディーラー {{ finished.dealerMp }} = {{ finished.playerMp - finished.dealerMp }}
          × {{ formatMoney(finished.result?.rate ?? settings?.rate ?? 0) }}
        </p>
        <p class="result-net" :class="{ plus: finished.net > 0, minus: finished.net < 0 }">
          {{ finished.net > 0 ? '+' : '' }}{{ formatMoney(finished.net) }}
        </p>
      </div>
    </Transition>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <!-- 操作 -->
    <Transition name="fade" mode="out-in">
      <div v-if="game && !finished" key="actions" class="actions">
        <p class="turn-note">
          <span>{{ raiseMode ? '攻撃する公開札を選んでください' : `あなたのターン(どの行動も MP ${dice(settings?.playerAttackCost)})` }}</span>
          <button class="resign-btn" :disabled="locked" @click="showResign = true">投了する</button>
        </p>
        <div class="main-actions">
          <button class="sub-btn call-btn" :disabled="locked" @click="act('call')">
            Call<small>勝負する</small>
          </button>
          <button
            class="sub-btn"
            :class="{ active: raiseMode }"
            :disabled="locked || !slots.slice(0, PUBLIC).some((s) => s.card)"
            @click="raiseMode = !raiseMode"
          >
            Raise<small>{{ raiseMode ? 'やめる' : '公開札を攻撃' }}</small>
          </button>
          <button class="sub-btn" :disabled="locked" @click="act('check')">
            Check<small>通常攻撃 {{ dice(settings?.playerDice) }}</small>
          </button>
        </div>
      </div>

      <div v-else-if="selectedPc && !game && !animating" key="start" class="start">
        <p v-if="remainingPlays === 0" class="error-text">今日はもう遊べません(1日{{ settings?.dailyLimit }}回まで)</p>
        <p class="plays-left">今日の残り: {{ remainingPlays }} / {{ settings?.dailyLimit ?? '-' }}回</p>
        <button class="play-btn" :disabled="!canStart" @click="start">{{ finished ? 'もう一度勝負する' : '勝負を始める' }}</button>
      </div>
    </Transition>

    <!-- ログ -->
    <div v-if="logs.length" ref="logBox" class="log" aria-live="polite">
      <p v-for="l in logs" :key="l.id" class="log-line" :class="l.cls.split(' ').filter(Boolean).map((c) => `l-${c}`)">{{ l.text }}</p>
    </div>

    <ConfirmDialog
      v-model="showResign"
      title="投了"
      :message="`自分の MP を0として精算します(ディーラーの MP ${mp.dealer ?? '-'} × ${formatMoney(settings?.rate ?? 0)}を支払います)。よろしいですか?`"
      confirm-label="投了する"
      @confirm="act('resign')"
    />

    <!-- ルール -->
    <details class="payouts">
      <summary>ルール</summary>
      <ol class="rule-list">
        <li>あなたとディーラーは、それぞれ MP {{ settings?.playerMp }} / {{ settings?.dealerMp }} から始めます。ダメージは MP を減らします。どちらかの MP が0を下回ったら終わり、(あなたの MP − ディーラーの MP)× {{ formatMoney(settings?.rate ?? 0) }}を受け取ります(マイナスなら支払います)。</li>
        <li><strong>札配り</strong>: ディーラーは MP 7d4-4 を使って53枚(Joker 入り)から7枚を引き、役を宣言します(嘘のこともあります)。4枚が公開札、3枚が伏せ札です。</li>
        <li>場に札がある間、ディーラーは宣言した役の倍率に応じて、回避の軽減率 +倍率×7%、攻撃のダメージ +(倍率d13)÷2 と、役の特殊効果を得ます。</li>
        <li><strong>あなたのターン</strong>(どれも MP {{ dice(settings?.playerAttackCost) }} を使う攻撃):
          <ul>
            <li><strong>Call</strong>: 勝負。伏せ札を開き、破れた枠を引き直す前の札で嘘かを確かめます。嘘ならディーラーはあなたの攻撃({{ dice(settings?.playerDice) }})を回避せずに受けます。宣言どおりなら《Showdown》の成功強度で軽減され、さらにディーラーの回避でも軽減されたうえで、宣言した役の 倍率d13 で反撃されます。勝負のあとは場の札を捨て、ディーラーが配り直します。</li>
            <li><strong>Raise</strong>: 公開札を攻撃します({{ dice(settings?.playerDice) }})。札は回避できず、ダメージ13ごとに1枚破れます。</li>
            <li><strong>Check</strong>: ディーラーに通常攻撃({{ dice(settings?.playerDice) }})します。</li>
          </ul>
        </li>
        <li><strong>ディーラーのターン</strong>(どれも MP {{ dice(settings?.dealerAttackCost) }} を使う): 自分の札を破る(Raise)か、通常攻撃({{ dice(settings?.dealerDice) }}+バフ)をします。ターン終了時に、破れた札を1枚 MP 1d8 で引き直します。</li>
        <li>判定は全員 技能値 {{ settings?.skill }}(ハード {{ Math.floor((settings?.skill ?? 0) / 2) }}以下、イクストリーム {{ Math.floor((settings?.skill ?? 0) / 5) }}以下)。回避の軽減率は、回避側の成功強度が 1段階上以上 100% / 同じ 80% / 1段階下 50% / 2段階下 20% / 3段階以下 0%。</li>
      </ol>
      <table class="payout-table">
        <tbody>
          <tr><th>役</th><th>倍率</th><th>特殊効果</th></tr>
          <tr v-for="h in SHOWDOWN_HANDS" :key="h.key">
            <th>{{ h.label }}</th>
            <td>{{ h.mult }}</td>
            <td class="effect">{{ h.effect || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </section>

  <section v-if="selectedPc" class="history">
    <h2 class="history-title">{{ selectedPc.name }}の Showdown 戦績(最新20件)</h2>
    <TransitionGroup name="row" tag="div">
      <div v-for="g in state?.recent ?? []" :key="g.id" class="history-row">
        <span class="history-date">{{ formatDateTime(g.createdAt) }}</span>
        <span class="history-name">
          {{ RESULT_LABELS[g.status] ?? g.status }}
          <template v-if="g.playerMp !== null">(MP {{ g.playerMp }} − {{ g.dealerMp }})</template>
        </span>
        <span class="history-net" :class="{ plus: g.net > 0, minus: g.net < 0 }">{{ g.net > 0 ? '+' : '' }}{{ formatMoney(g.net) }}</span>
      </div>
    </TransitionGroup>
    <p v-if="(state?.recent ?? []).length === 0" class="empty">まだ遊んでいません</p>
  </section>
</template>

<style scoped>
.game {
  border: 2px solid #000;
  box-shadow: 4px 4px 0 #000;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 14px;
}

.game-title {
  margin: 0 0 4px;
  font-size: 1.1rem;
}

.game-rule {
  margin: 0 0 12px;
  font-size: 0.75rem;
  opacity: 0.7;
}

.dealer-info {
  margin: -6px 0 10px;
  font-size: 0.8rem;
}

/* ---------- MP ---------- */
.mp-board {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.mp-row {
  position: relative;
  display: grid;
  grid-template-columns: 5.5em 1fr 2.5em;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.mp-name {
  font-weight: bold;
}

.mp-bar {
  height: 12px;
  border: 1px solid #000;
  background: #eee;
  overflow: hidden;
}

.mp-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.mp-fill.player {
  background: #1565c0;
}

.mp-fill.dealer {
  background: #b71c1c;
}

.mp-bar.low {
  animation: pulse 0.9s ease-in-out infinite;
}

@keyframes pulse {
  50% { box-shadow: 0 0 0 2px var(--color-accent, #ffd400); }
}

.mp-value {
  text-align: right;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.floats {
  position: absolute;
  right: 0;
  top: -14px;
  pointer-events: none;
}

.float {
  position: absolute;
  right: 0;
  font-weight: bold;
  font-size: 0.95rem;
  white-space: nowrap;
  animation: float-up 1.2s ease-out forwards;
}

.float.damage {
  color: var(--color-error, #c62828);
}

.float.cost {
  color: #555;
  font-size: 0.8rem;
}

@keyframes float-up {
  0% { transform: translateY(6px); opacity: 0; }
  20% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-14px); opacity: 0; }
}

/* ---------- 卓 ---------- */
.table {
  scroll-margin-top: 72px;
  padding: 12px 10px 14px;
  background: radial-gradient(ellipse at center, #14532d 0%, #0d3b1e 70%);
  border: 2px solid #000;
  color: #fff;
}

.declare {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  margin: 0 0 12px;
  text-align: center;
}

.declare-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.declare-label {
  font-size: 0.7rem;
  color: var(--color-accent, #ffd400);
}

.declare-hand {
  font-size: 1.3rem;
  letter-spacing: 0.08em;
}

.buff {
  font-size: 0.68rem;
  opacity: 0.85;
}

.declare-idle {
  font-size: 0.8rem;
  opacity: 0.85;
}

.declare-enter-active {
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

.declare-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.declare-enter-from {
  transform: scale(0.6);
  opacity: 0;
}

.declare-leave-to {
  transform: scale(0.9);
  opacity: 0;
}

.cards {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.card-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.group-label {
  font-size: 0.65rem;
  color: var(--color-accent, #ffd400);
}

.card-row {
  display: flex;
  gap: 10px;
}

.slot {
  position: relative;
  width: 52px;
  height: 74px;
  border-radius: 4px;
  outline: 1px dashed rgba(255, 255, 255, 0.4);
  outline-offset: -1px;
}

.slot.dealt {
  outline-color: transparent;
}

/* 札を置く: 上から滑り込む(位置と透明度は外側で動かす。札そのものに透明度を付けると裏表の重なりが崩れるため) */
.deal {
  position: absolute;
  inset: 0;
  perspective: 400px;
  transform: translateY(-36px) scale(0.85);
  opacity: 0;
  transition:
    transform 0.42s cubic-bezier(0.2, 0.8, 0.3, 1),
    opacity 0.25s ease;
}

.slot.dealt .deal {
  transform: none;
  opacity: 1;
}

.card3d {
  position: absolute;
  inset: 0;
  padding: 0;
  border: none;
  background: none;
  transform-style: preserve-3d;
  transform: rotateY(180deg);
  transition: transform 0.42s cubic-bezier(0.2, 0.8, 0.3, 1);
  cursor: default;
  font-family: inherit;
}

.card3d.up {
  transform: rotateY(0deg);
}

.face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid #000;
  border-radius: 4px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  font-weight: bold;
  line-height: 1;
}

.front {
  background: #fff;
  color: #000;
}

.front.red {
  color: #c62828;
}

.front.joker .card-num {
  font-size: 0.65rem;
  letter-spacing: 0.02em;
}

.back {
  transform: rotateY(180deg);
  background: repeating-linear-gradient(45deg, #7a1010 0 4px, #a51c1c 4px 8px);
}

.card-num {
  font-size: 1.25rem;
}

.card-suit {
  font-size: 1.15rem;
}

.slot.target .card3d {
  cursor: pointer;
}

.slot.target .deal {
  animation: bob 0.9s ease-in-out infinite;
}

.slot.target .face {
  box-shadow: 0 0 0 3px var(--color-accent, #ffd400);
}

@keyframes bob {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -4px; }
}

.slot.tearing .deal {
  animation: tear 0.5s ease-in forwards;
}

@keyframes tear {
  0% { translate: 0 0; rotate: 0deg; opacity: 1; }
  25% { translate: -3px 0; rotate: -6deg; }
  45% { translate: 3px 0; rotate: 6deg; opacity: 1; }
  100% { translate: 0 40px; rotate: 25deg; opacity: 0; }
}

.torn-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.7);
  animation: fade-in 0.25s ease;
}

.slot.used .face {
  box-shadow: 0 0 0 3px var(--color-accent, #ffd400), 0 0 12px var(--color-accent, #ffd400);
}

.slot.used .deal {
  animation: lift 0.35s ease-out both;
}

.slot.checked .face {
  box-shadow: 0 0 0 3px #fff, 0 0 10px #fff;
}

@keyframes lift {
  from { translate: 0 0; }
  to { translate: 0 -5px; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.verdict {
  margin: 12px 0 0;
  padding: 6px 10px;
  text-align: center;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.verdict.bluff {
  background: var(--color-accent, #ffd400);
  color: #000;
  border-color: #000;
  font-weight: bold;
}

.pop-enter-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

.pop-enter-from {
  transform: scale(0.85);
  opacity: 0;
}

/* ---------- ダイス(卓の下の段) ---------- */
.stage {
  display: grid;
  grid-template-rows: 18px minmax(40px, auto) 26px;
  justify-items: center;
  align-items: center;
  row-gap: 4px;
  min-height: 108px;
  margin-top: 12px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.8rem;
}

.stage-label {
  text-align: center;
  font-size: 0.72rem;
  color: var(--color-accent, #ffd400);
}

.stage-text {
  grid-row: 1 / -1;
  font-size: 0.8rem;
}

.stage-idle {
  opacity: 0.4;
}

.stage-dice {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-result {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
}

.d100 {
  width: 3.2em;
  padding: 2px 6px;
  border: 2px solid #000;
  border-radius: 6px;
  background: #fff;
  color: #000;
  font-size: 1.3rem;
  font-weight: bold;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.d100.rolling,
.die.rolling {
  animation: shake 0.12s linear infinite;
}

.stage-target {
  opacity: 0.8;
}

.level {
  padding: 2px 8px;
  font-weight: bold;
  border: 1px solid #000;
}

.level small {
  font-size: 0.65rem;
  font-weight: normal;
}

.level0 {
  background: #555;
  color: #fff;
}

.level1 {
  background: #fff;
  color: #000;
}

.level2 {
  background: #64b5f6;
  color: #000;
}

.level3 {
  background: var(--color-accent, #ffd400);
  color: #000;
}

.dice-faces {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.die {
  min-width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #000;
  border-radius: 4px;
  background: #fff;
  color: #000;
  font-weight: bold;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.die.waiting {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}

.die.bonus {
  padding: 0 4px;
  background: var(--color-accent, #ffd400);
}

.dmg-total strong {
  font-size: 1.15rem;
  color: #ff8a80;
}

@keyframes shake {
  0%, 100% { rotate: -8deg; }
  50% { rotate: 8deg; }
}

/* ---------- ログ ---------- */
.log {
  max-height: 180px;
  overflow-y: auto;
  margin-top: 10px;
  padding: 6px 8px;
  border: 1px solid #000;
  background: #111;
  color: #ddd;
  font-size: 0.75rem;
  line-height: 1.5;
}

.log-line {
  margin: 0;
  animation: log-in 0.2s ease;
}

@keyframes log-in {
  from { transform: translateX(-6px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.log-line.l-turn {
  margin-top: 4px;
  color: var(--color-accent, #ffd400);
  font-weight: bold;
}

.log-line.l-declare {
  color: #fff;
  font-weight: bold;
}

.log-line.l-hit.l-dealer {
  color: #81c784;
}

.log-line.l-hit.l-player {
  color: #ef9a9a;
}

.log-line.l-cost,
.log-line.l-miss {
  opacity: 0.7;
}

.log-line.l-bluff {
  color: var(--color-accent, #ffd400);
  font-weight: bold;
}

/* ---------- 結果 ---------- */
.result {
  margin-top: 12px;
  padding: 10px;
  border: 2px solid #000;
  background: #eee;
  color: #000;
  text-align: center;
}

.result.win {
  background: var(--color-accent, #ffd400);
}

.result.lose,
.result.fold {
  background: #000;
  color: #fff;
}

.result-enter-active {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.result-enter-from {
  transform: translateY(16px) scale(0.92);
  opacity: 0;
}

.result-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.result-line {
  margin: 4px 0 0;
  font-size: 0.85rem;
}

.result-net {
  margin: 6px 0 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.result.lose .result-net.minus,
.result.fold .result-net.minus {
  color: #ff8a80;
}

/* ---------- 操作 ---------- */
.actions {
  margin-top: 12px;
}

.turn-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 0.75rem;
}

.turn-note > span {
  opacity: 0.75;
}

.main-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.call-btn {
  background: var(--color-accent, #ffd400);
  color: #000;
  box-shadow: 3px 3px 0 #000;
}

.sub-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 52px;
  padding: 6px;
  border: 2px solid #000;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.08s ease;
}

.sub-btn small,
.play-btn small {
  display: block;
  font-size: 0.7rem;
  font-weight: normal;
  opacity: 0.75;
  letter-spacing: 0;
}

.sub-btn.active {
  background: #000;
  color: var(--color-accent, #ffd400);
}

.sub-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sub-btn:not(:disabled):active {
  transform: translateY(2px);
}

.resign-btn {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 4px;
  border: none;
  background: none;
  color: var(--color-error, #c62828);
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
}

.resign-btn:disabled {
  opacity: 0.4;
}

.start {
  margin-top: 12px;
}

.plays-left {
  margin: 6px 0 0;
  font-size: 0.8rem;
  text-align: right;
}

.error-text {
  margin: 6px 0 0;
  color: var(--color-error, #c62828);
  font-size: 0.8rem;
}

.play-btn {
  width: 100%;
  margin-top: 8px;
  border: 2px solid #000;
  background: var(--color-accent, #ffd400);
  color: #000;
  padding: 10px;
  font-size: 1.05rem;
  font-weight: bold;
  letter-spacing: 0.1em;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 3px 3px 0 #000;
  transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.2s ease;
}

.play-btn:not(:disabled):active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 #000;
}

.play-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---------- ルール ---------- */
.payouts {
  margin-top: 16px;
  font-size: 0.85rem;
}

.payouts summary {
  cursor: pointer;
  font-weight: bold;
}

.rule-list {
  margin: 8px 0;
  padding-left: 1.3em;
  font-size: 0.8rem;
  line-height: 1.6;
}

.rule-list ul {
  padding-left: 1.1em;
}

.payout-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 6px;
}

.payout-table th,
.payout-table td {
  border-bottom: 1px dashed var(--color-line, rgba(0, 0, 0, 0.2));
  padding: 4px 2px;
  text-align: left;
  font-size: 0.8rem;
}

.payout-table .effect {
  font-size: 0.72rem;
}

.plus {
  color: var(--color-plus, #1b7f2a);
}

.minus {
  color: var(--color-error, #c62828);
}

/* ---------- 戦績 ---------- */
.history {
  margin-top: 24px;
}

.history-title {
  font-size: 0.95rem;
  margin: 0 0 6px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--color-text, #000);
}

.history-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-line, rgba(0, 0, 0, 0.2));
  font-size: 0.8rem;
}

.row-enter-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.row-enter-from {
  transform: translateY(-8px);
  opacity: 0;
}

.history-date {
  font-size: 0.7rem;
  opacity: 0.6;
  white-space: nowrap;
}

.history-name {
  flex: 1;
  min-width: 0;
}

.history-net {
  font-weight: bold;
  white-space: nowrap;
}

.empty {
  padding: 12px;
  border: 1px dashed var(--color-text, #000);
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.6;
}

/* スマホ: 卓・ダイス・MP・操作が1画面に収まるように詰める */
@media (max-width: 600px) {
  .table {
    padding: 8px 8px 10px;
  }

  .declare {
    min-height: 52px;
    margin-bottom: 6px;
  }

  .declare-hand {
    font-size: 1.15rem;
  }

  .cards {
    gap: 8px;
  }

  .card-row {
    gap: 8px;
  }

  .slot {
    width: 46px;
    height: 64px;
  }

  .card-num {
    font-size: 1.1rem;
  }

  .card-suit {
    font-size: 1rem;
  }

  .stage {
    grid-template-rows: 16px minmax(36px, auto) 24px;
    min-height: 92px;
    margin-top: 8px;
    padding: 4px 6px;
  }

  .mp-board {
    gap: 4px;
    margin-top: 8px;
  }

  .actions {
    margin-top: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card3d,
  .deal,
  .mp-fill,
  .sub-btn,
  .play-btn,
  .declare-enter-active,
  .declare-leave-active,
  .result-enter-active,
  .pop-enter-active,
  .row-enter-active {
    transition: none !important;
  }

  .slot .deal,
  .torn-mark,
  .mp-bar,
  .float,
  .d100,
  .die,
  .log-line {
    animation: none !important;
  }
}
</style>
