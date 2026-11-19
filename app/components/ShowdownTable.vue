<script setup>
// カジノの「Showdown」(魔術《Showdown》を元にした、ディーラーとのカード勝負)
// 卓の札は slots(7枠)で表示を持ち、配る・破る・開くときは順番にアニメーションさせる
const { refreshMyPcs, selectedPcId, selectedPc } = await useMyPcs()

const { data: state, refresh: refreshState } = await useFetch('/api/casino/showdown/state', {
  key: 'showdown-state',
  query: computed(() => ({ pcId: selectedPcId.value })),
  immediate: !!selectedPcId.value,
  watch: [selectedPcId],
})

const PUBLIC = 4
const settings = computed(() => state.value?.settings ?? null)
const game = computed(() => state.value?.game ?? null)
// 終わった直後の勝負(結果を見せる。次の勝負を始めるまで残す)
const finished = ref(null)
const shown = computed(() => game.value ?? finished.value)

const handLabelOf = (key) => SHOWDOWN_HANDS.find((h) => h.key === key)?.label ?? key
const remainingPlays = computed(() => Math.max(0, (settings.value?.dailyLimit ?? 0) - (state.value?.playsToday ?? 0)))
const isLedger = computed(() => selectedPc.value?.money_mode === 'ledger')
const raiseFee = computed(() => (shown.value ? Math.ceil((shown.value.bet * (settings.value?.raiseFee ?? 0)) / 100) : 0))
const raisesLeft = computed(() => Math.max(0, (settings.value?.raiseMax ?? 0) - (game.value?.raises ?? 0)))

// --- 卓の表示 ---
// card: 札 / up: 表向き / dealt: 卓に置かれている / torn: 破れた枠 / tearing: 破れている途中 / used: 役に使った札
const emptySlot = () => ({ card: null, up: false, dealt: false, torn: false, tearing: false, used: false })
const slots = ref(Array.from({ length: 7 }, emptySlot))
const declaredShown = ref(null)
const animating = ref(false)
const diceShown = ref(null)

// 動きを減らす設定の人には待ち時間なしで表示する
let reduceMotion = false
onMounted(() => {
  reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
})
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms))

// アニメーションなしで、勝負の状態をそのまま卓に並べる
const syncStatic = (g) => {
  if (!g) {
    slots.value = Array.from({ length: 7 }, emptySlot)
    declaredShown.value = null
    return
  }
  const cards = [...g.publicCards, ...(g.hiddenCards ?? [null, null, null])]
  const role = g.result?.handCards ?? []
  slots.value = cards.map((card, i) => ({
    ...emptySlot(),
    card,
    dealt: true,
    up: i < PUBLIC ? !!card : !!g.hiddenCards,
    torn: i < PUBLIC && !card,
    used: !!card && role.includes(card),
  }))
  declaredShown.value = g.declared
}

// 読み込み直したときは、アニメーション中でなければ今の状態に合わせる
watch(game, (g) => {
  if (animating.value) return
  if (g) syncStatic(g)
  else if (!finished.value) syncStatic(null)
}, { immediate: true })
watch(selectedPcId, () => {
  finished.value = null
  diceShown.value = null
})

// --- 掛金(チンチロと同じく100万円単位) ---
const bet = ref(100)
const betPresets = [100, 500, 1000]
const betValid = computed(() => Number.isInteger(bet.value) && bet.value >= (settings.value?.betUnit ?? 100) && bet.value % (settings.value?.betUnit ?? 100) === 0)
const effectiveBet = computed(() => (isLedger.value ? settings.value?.ledgerBet ?? 100 : bet.value))
const busy = ref(false)
const locked = computed(() => busy.value || animating.value)
const canStart = computed(() =>
  !!selectedPc.value && !game.value && remainingPlays.value > 0 && !locked.value
  && (isLedger.value || (betValid.value && selectedPc.value.money >= bet.value))
)

const errorMessage = ref('')
const raiseMode = ref(false)

// 操作を送り、アニメーションのあとで所持金と状態を読み込み直す
const run = async (fn) => {
  busy.value = true
  animating.value = true
  errorMessage.value = ''
  try {
    await fn()
  } catch (e) {
    errorMessage.value = e?.data?.statusMessage ?? '通信に失敗しました'
    if (game.value) syncStatic(game.value)
  } finally {
    busy.value = false
    animating.value = false
    await Promise.all([refreshState(), refreshMyPcs()])
  }
}

// 配る: 前の札を片付け、7枚を1枚ずつ置いてから公開札を順にめくる
const start = () => run(async () => {
  raiseMode.value = false
  diceShown.value = null
  if (finished.value || slots.value.some((s) => s.dealt)) {
    finished.value = null
    slots.value = slots.value.map((s) => ({ ...s, dealt: false, used: false }))
    declaredShown.value = null
    await wait(260)
  }
  const res = await $fetch('/api/casino/showdown/start', { method: 'POST', body: { pcId: selectedPcId.value, bet: effectiveBet.value } })
  const g = res.game
  slots.value = Array.from({ length: 7 }, (_, i) => ({ ...emptySlot(), card: i < PUBLIC ? g.publicCards[i] : null }))
  for (let i = 0; i < 7; i++) {
    slots.value[i].dealt = true
    await wait(110)
  }
  await wait(150)
  for (let i = 0; i < PUBLIC; i++) {
    slots.value[i].up = true
    await wait(230)
  }
  await wait(200)
  declaredShown.value = g.declared
})

// Raise: 選んだ札を破ってから、ディーラーの宣言し直しを見せる
const raise = (i) => run(async () => {
  raiseMode.value = false
  slots.value[i].tearing = true
  const [res] = await Promise.all([
    $fetch('/api/casino/showdown/action', { method: 'POST', body: { gameId: game.value.id, action: 'raise', slot: i } }),
    wait(500),
  ])
  slots.value[i] = { ...emptySlot(), dealt: true, torn: true }
  await wait(250)
  declaredShown.value = res.game.declared
})

// 勝負・降りる: 手札を1枚ずつ開き、勝負なら破れた枠を引き直してから結果を出す
const finish = (action) => run(async () => {
  raiseMode.value = false
  const res = await $fetch('/api/casino/showdown/action', { method: 'POST', body: { gameId: game.value.id, action } })
  const g = res.game
  const role = g.result?.handCards ?? []

  for (let j = 0; j < 3; j++) {
    const i = PUBLIC + j
    slots.value[i].card = g.hiddenCards[j]
    await wait(60)
    slots.value[i].up = true
    await wait(380)
  }
  if (action === 'call') {
    // 破れた枠に新しい札が来る
    for (let i = 0; i < PUBLIC; i++) {
      if (slots.value[i].card) continue
      slots.value[i] = { ...emptySlot(), card: g.publicCards[i] }
      await wait(40)
      slots.value[i].dealt = true
      await wait(220)
      slots.value[i].up = true
      await wait(300)
    }
    await wait(250)
    slots.value = slots.value.map((s) => ({ ...s, used: !!s.card && role.includes(s.card) }))
    // ダイスを転がしてから止める
    if (g.result?.dice) {
      const sides = settings.value?.diceSides ?? 10
      for (let k = 0; k < 8; k++) {
        diceShown.value = g.result.dice.map(() => 1 + Math.floor(Math.random() * sides))
        await wait(70)
      }
      diceShown.value = g.result.dice
    }
    await wait(350)
  }
  finished.value = g
})

const onCardClick = (i) => {
  if (!raiseMode.value || !slots.value[i].card || locked.value || i >= PUBLIC) return
  raise(i)
}

const RESULT_LABELS = { win: 'あなたの勝ち', lose: 'ディーラーの勝ち', push: '引き分け', fold: '降りました' }
const resultLabel = (g) => RESULT_LABELS[g.status] ?? ''
</script>

<template>
  <section class="game showdown">
    <h2 class="game-title">Showdown</h2>
    <p class="game-rule">
      ディーラーが7枚を引いて役を宣言します(嘘のこともあります)。公開札を破って確かめるか、降りるか、勝負するかを選んでください。
    </p>
    <p v-if="settings?.dealerPcName" class="dealer-info">ディーラー: <strong>{{ settings.dealerPcName }}</strong></p>

    <!-- 卓 -->
    <div class="table">
      <div class="declare">
        <Transition name="declare" mode="out-in">
          <div v-if="declaredShown" :key="declaredShown" class="declare-inner">
            <span class="declare-label">ディーラーの宣言</span>
            <strong class="declare-hand">{{ handLabelOf(declaredShown) }}</strong>
          </div>
          <span v-else-if="!shown && !animating" key="idle" class="declare-idle">掛金を決めて「札を配る」</span>
          <span v-else key="wait" class="declare-idle">…</span>
        </Transition>
      </div>

      <div class="cards">
        <div v-for="group in [{ label: '公開札', from: 0, to: PUBLIC }, { label: '手札', from: PUBLIC, to: 7 }]" :key="group.label" class="card-group">
          <span class="group-label">{{ group.label }}</span>
          <div class="card-row">
            <div
              v-for="i in group.to - group.from"
              :key="group.from + i"
              class="slot"
              :class="{
                dealt: slots[group.from + i - 1].dealt,
                tearing: slots[group.from + i - 1].tearing,
                torn: slots[group.from + i - 1].torn,
                target: raiseMode && group.from === 0 && slots[i - 1].card,
                used: slots[group.from + i - 1].used,
              }"
            >
              <span v-if="slots[group.from + i - 1].torn" class="torn-mark">破れ</span>
              <span v-else class="deal">
              <button
                class="card3d"
                :class="{ up: slots[group.from + i - 1].up }"
                :disabled="!(raiseMode && group.from === 0 && slots[i - 1].card) || locked"
                :aria-label="slots[group.from + i - 1].up && slots[group.from + i - 1].card
                  ? `${cardFace(slots[group.from + i - 1].card).suit}${cardFace(slots[group.from + i - 1].card).label}`
                  : '伏せた札'"
                @click="onCardClick(group.from + i - 1)"
              >
                <span
                  class="face front"
                  :class="{ red: cardFace(slots[group.from + i - 1].card)?.red, joker: cardFace(slots[group.from + i - 1].card)?.joker }"
                >
                  <template v-if="slots[group.from + i - 1].card">
                    <span class="card-num">{{ cardFace(slots[group.from + i - 1].card).label }}</span>
                    <span class="card-suit">{{ cardFace(slots[group.from + i - 1].card).suit }}</span>
                  </template>
                </span>
                <span class="face back" />
              </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 勝負のダイス -->
      <Transition name="fade">
        <p v-if="diceShown" class="dice-line">
          あなたのダメージ <strong>{{ diceShown.reduce((a, b) => a + b, 0) }}</strong>
          <span class="dice-faces">
            <span v-for="(d, k) in diceShown" :key="k" class="die">{{ d }}</span>
          </span>
        </p>
      </Transition>
    </div>

    <!-- 結果 -->
    <Transition name="result">
      <div v-if="finished && !animating" class="result" :class="finished.status">
        <p class="result-title">{{ resultLabel(finished) }}</p>
        <template v-if="finished.result?.hand">
          <p class="result-line">
            実際の役: <strong>{{ handLabelOf(finished.result.hand) }}</strong>
            <template v-if="finished.result.bluff">(宣言は嘘でした)</template>
          </p>
          <p v-if="!finished.result.bluff" class="result-line">
            ダメージ: ディーラー {{ finished.result.dealerDamage }} / あなた {{ finished.result.playerDamage }}
          </p>
        </template>
        <p class="result-net" :class="{ plus: finished.net > 0, minus: finished.net < 0 }">
          {{ finished.net > 0 ? '+' : '' }}{{ formatMoney(finished.net) }}
        </p>
      </div>
    </Transition>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <!-- 勝負中の操作 -->
    <Transition name="fade" mode="out-in">
      <div v-if="game && !finished" key="actions" class="actions">
        <p class="bet-now">掛金 {{ formatMoney(game.bet) }}<template v-if="game.raiseFeeTotal"> + 料金 {{ formatMoney(game.raiseFeeTotal) }}</template></p>
        <button class="play-btn" :disabled="locked" @click="finish('call')">Call(勝負する)</button>
        <div class="sub-actions">
          <button
            class="sub-btn"
            :class="{ active: raiseMode }"
            :disabled="locked || raisesLeft === 0 || !game.publicCards.some(Boolean)"
            @click="raiseMode = !raiseMode"
          >
            Raise
            <small>{{ raiseMode ? '破る札を選んでください' : `札を1枚破る・${formatMoney(raiseFee)}(残り${raisesLeft}回)` }}</small>
          </button>
          <button class="sub-btn" :disabled="locked" @click="finish('fold')">
            Check
            <small>降りる・{{ formatMoney(Math.floor(game.bet / 2)) }}が戻る</small>
          </button>
        </div>
      </div>

      <!-- 掛金と開始 -->
      <div v-else-if="selectedPc && !game" key="bet" class="bet">
        <template v-if="isLedger">
          <p class="ledger-bet-note">出納帳のPCは掛金{{ formatMoney(settings?.ledgerBet ?? 100) }}固定です</p>
        </template>
        <template v-else>
          <label class="bet-label" for="showdown-bet">掛金({{ MONEY_UNIT }})</label>
          <input id="showdown-bet" v-model.number="bet" type="number" inputmode="numeric" :step="settings?.betUnit ?? 100" :min="settings?.betUnit ?? 100" class="bet-input" />
          <div class="bet-presets">
            <button v-for="p in betPresets" :key="p" class="preset-btn" :class="{ active: bet === p }" @click="bet = p">{{ formatMoney(p) }}</button>
          </div>
          <p v-if="!betValid" class="error-text">掛金は{{ formatMoney(settings?.betUnit ?? 100) }}単位で指定してください</p>
          <p v-else-if="selectedPc.money < bet" class="error-text">所持金が掛金に足りません</p>
        </template>
        <p v-if="remainingPlays === 0" class="error-text">今日はもう遊べません(1日{{ settings?.dailyLimit }}回まで)</p>
        <p class="plays-left">今日の残り: {{ remainingPlays }} / {{ settings?.dailyLimit ?? '-' }}回</p>
        <button class="play-btn" :disabled="!canStart" @click="start">{{ finished ? 'もう一度配る' : '札を配る' }}</button>
      </div>
    </Transition>

    <!-- ルールと配当 -->
    <details class="payouts">
      <summary>ルールと配当</summary>
      <ol class="rule-list">
        <li>掛金を払うと、ディーラーが53枚(Joker 1枚入り)から7枚を引きます。左4枚が公開札、右3枚が伏せた手札です。</li>
        <li>ディーラーは役を1つ宣言します。宣言は嘘のこともあります。</li>
        <li><strong>Raise</strong>: 料金(掛金の{{ settings?.raiseFee }}%)を払って公開札を1枚破ります({{ settings?.raiseMax }}回まで)。破られるとディーラーは宣言をし直します。</li>
        <li><strong>Check</strong>: 勝負せずに降ります。掛金の半分が戻ります。</li>
        <li><strong>Call</strong>: 手札を開き、破れた札を引き直して、7枚のうち一番強い5枚で役を決めます。
          <ul>
            <li>実際の役が宣言より弱ければ(嘘)、あなたの勝ち。<strong>宣言された役</strong>の倍率で払い戻します。</li>
            <li>宣言どおりなら、ディーラーのダメージ(役に使った札の数字の合計×ダメージ倍率)と、あなたのダメージ({{ settings?.diceCount }}d{{ settings?.diceSides }})を比べます。あなたの方が大きければ<strong>実際の役</strong>の倍率で払い戻し、同じなら掛金が戻ります。</li>
          </ul>
        </li>
      </ol>
      <p class="payout-note">数字は2〜10がそのまま、J=11、Q=12、K=13、A=14。Joker は役が一番強くなる札として扱います。</p>
      <table class="payout-table">
        <tbody>
          <tr><th>役</th><th>ダメージ</th><th>払い戻し</th></tr>
          <tr v-for="h in SHOWDOWN_HANDS" :key="h.key">
            <th>{{ h.label }}</th>
            <td>×{{ h.damage }}</td>
            <td class="payout-mult">{{ settings?.payouts?.[h.key] ?? '-' }}倍</td>
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
          {{ g.status === 'fold' ? '降りた' : handLabelOf(g.result?.hand) }}<template v-if="g.result?.bluff">(嘘を見破った)</template>
          (掛金{{ formatMoney(g.bet) }})
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

/* ---------- 卓: 緑のフェルト ---------- */
.table {
  padding: 12px 10px 14px;
  background: radial-gradient(ellipse at center, #14532d 0%, #0d3b1e 70%);
  border: 2px solid #000;
  color: #fff;
}

.declare {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  margin: 0 0 12px;
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

.declare-idle {
  font-size: 0.8rem;
  opacity: 0.85;
}

/* 宣言が変わるときは、いったん縮んでから出る */
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
  gap: 10px;
  justify-content: center;
}

.card-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.group-label {
  font-size: 0.65rem;
  color: var(--color-accent, #ffd400);
}

.card-row {
  display: flex;
  gap: 4px;
}

/* ---------- 札 ---------- */
/* 枠(札が置かれていないときは点線の場所だけ見せる)。スマホ幅で7枚が1行に並ぶ大きさ */
.slot {
  position: relative;
  width: 40px;
  height: 58px;
  border-radius: 4px;
  outline: 1px dashed rgba(255, 255, 255, 0.4);
  outline-offset: -1px;
}

.slot.dealt {
  outline-color: transparent;
}

/* 札を置く: 上から滑り込む(位置と透明度はこの枠で動かす。札そのものに透明度を付けると裏表の重なりが崩れるため) */
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

/* 表にめくる */
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
  font-size: 0.55rem;
  letter-spacing: 0.02em;
}

.back {
  transform: rotateY(180deg);
  background: repeating-linear-gradient(45deg, #7a1010 0 4px, #a51c1c 4px 8px);
}

.card-num {
  font-size: 1rem;
}

.card-suit {
  font-size: 0.95rem;
}

/* Raise で選べる札は、浮き沈みして知らせる */
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

/* 破る: 揺れてから傾きながら落ちて消える */
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

/* 勝負のあと、役に使った札は光って少し持ち上がる */
.slot.used .face {
  box-shadow: 0 0 0 3px var(--color-accent, #ffd400), 0 0 12px var(--color-accent, #ffd400);
}

.slot.used .deal {
  animation: lift 0.35s ease-out both;
}

@keyframes lift {
  from { translate: 0 0; }
  to { translate: 0 -5px; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---------- ダイス ---------- */
.dice-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0 0;
  font-size: 0.8rem;
}

.dice-line strong {
  font-size: 1.1rem;
  min-width: 1.6em;
  text-align: center;
}

.dice-faces {
  display: flex;
  gap: 4px;
}

.die {
  min-width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #000;
  border-radius: 4px;
  background: #fff;
  color: #000;
  font-weight: bold;
  font-size: 0.8rem;
}

/* ---------- 結果: 下から弾んで出る ---------- */
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

.result.lose {
  background: #000;
  color: #fff;
}

.result-enter-active {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.result-leave-active {
  transition: opacity 0.2s ease;
}

.result-enter-from {
  transform: translateY(16px) scale(0.92);
  opacity: 0;
}

.result-leave-to {
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

.result.lose .result-net.minus {
  color: #ff8a80;
}

/* ---------- 操作 ---------- */
.actions {
  margin-top: 12px;
}

.bet-now {
  margin: 0 0 4px;
  font-size: 0.8rem;
  text-align: right;
}

.sub-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
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

.sub-btn small {
  font-size: 0.7rem;
  font-weight: normal;
  opacity: 0.75;
}

.sub-btn.active {
  background: #000;
  color: var(--color-accent, #ffd400);
}

.sub-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 押したときに沈む */
.sub-btn:not(:disabled):active,
.preset-btn:active {
  transform: translateY(2px);
}

.bet {
  margin-top: 14px;
}

.bet-label {
  display: block;
  font-size: 0.75rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.bet-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #000;
  padding: 8px;
  text-align: right;
  background: var(--color-bg, #fff);
}

.bet-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 6px;
}

.preset-btn {
  min-height: 36px;
  border: 1px solid #000;
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.15s ease, transform 0.08s ease;
}

.preset-btn.active {
  background: var(--color-accent, #ffd400);
  font-weight: bold;
}

.ledger-bet-note,
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
  margin-top: 12px;
  border: 2px solid #000;
  background: var(--color-accent, #ffd400);
  color: #000;
  padding: 12px;
  font-size: 1.05rem;
  font-weight: bold;
  letter-spacing: 0.1em;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 3px 3px 0 #000;
  transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.2s ease;
}

/* 押したときは影の分だけ沈む */
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

/* ---------- ルールと配当 ---------- */
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

.payout-mult {
  text-align: right !important;
  font-weight: bold;
}

.payout-note {
  font-size: 0.75rem;
  opacity: 0.75;
}

.plus {
  color: var(--color-plus, #1b7f2a);
}

.minus {
  color: var(--color-error, #c62828);
}

/* ---------- 戦績: 新しい行は上から差し込まれる ---------- */
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

/* 動きを減らす設定では、アニメーションを止める */
@media (prefers-reduced-motion: reduce) {
  .card3d,
  .deal,
  .sub-btn,
  .preset-btn,
  .play-btn,
  .declare-enter-active,
  .declare-leave-active,
  .result-enter-active,
  .row-enter-active {
    transition: none !important;
  }

  .slot .deal,
  .torn-mark {
    animation: none !important;
  }
}
</style>
