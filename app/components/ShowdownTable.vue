<script setup>
// カジノの「Showdown」(魔術《Showdown》を元にした、ディーラーとのカード勝負)
const { refreshMyPcs, selectedPcId, selectedPc } = await useMyPcs()

const { data: state, refresh: refreshState } = await useFetch('/api/casino/showdown/state', {
  key: 'showdown-state',
  query: computed(() => ({ pcId: selectedPcId.value })),
  immediate: !!selectedPcId.value,
  watch: [selectedPcId],
})

const settings = computed(() => state.value?.settings ?? null)
const game = computed(() => state.value?.game ?? null)
// 終わった直後の勝負(結果を見せる。次の勝負を始めるまで残す)
const finished = ref(null)
watch(selectedPcId, () => {
  finished.value = null
})
const shown = computed(() => game.value ?? finished.value)

const handLabelOf = (key) => SHOWDOWN_HANDS.find((h) => h.key === key)?.label ?? key
const remainingPlays = computed(() => Math.max(0, (settings.value?.dailyLimit ?? 0) - (state.value?.playsToday ?? 0)))
const isLedger = computed(() => selectedPc.value?.money_mode === 'ledger')
const raiseFee = computed(() => (shown.value ? Math.ceil((shown.value.bet * (settings.value?.raiseFee ?? 0)) / 100) : 0))
const raisesLeft = computed(() => Math.max(0, (settings.value?.raiseMax ?? 0) - (game.value?.raises ?? 0)))

// --- 掛金(チンチロと同じく100万円単位) ---
const bet = ref(100)
const betPresets = [100, 500, 1000]
const betValid = computed(() => Number.isInteger(bet.value) && bet.value >= (settings.value?.betUnit ?? 100) && bet.value % (settings.value?.betUnit ?? 100) === 0)
const effectiveBet = computed(() => (isLedger.value ? settings.value?.ledgerBet ?? 100 : bet.value))
const canStart = computed(() =>
  !!selectedPc.value && !game.value && remainingPlays.value > 0 && !busy.value
  && (isLedger.value || (betValid.value && selectedPc.value.money >= bet.value))
)

const busy = ref(false)
const errorMessage = ref('')
const raiseMode = ref(false)

const call = async (fn) => {
  busy.value = true
  errorMessage.value = ''
  try {
    await fn()
  } catch (e) {
    errorMessage.value = e?.data?.statusMessage ?? '通信に失敗しました'
  } finally {
    busy.value = false
    await Promise.all([refreshState(), refreshMyPcs()])
  }
}

const start = () => call(async () => {
  finished.value = null
  raiseMode.value = false
  await $fetch('/api/casino/showdown/start', { method: 'POST', body: { pcId: selectedPcId.value, bet: effectiveBet.value } })
})

const act = (action, slot) => call(async () => {
  raiseMode.value = false
  const res = await $fetch('/api/casino/showdown/action', { method: 'POST', body: { gameId: game.value.id, action, slot } })
  if (res.game.status !== 'playing') finished.value = res.game
})

const onCardClick = (i) => {
  if (!raiseMode.value || !game.value?.publicCards[i] || busy.value) return
  act('raise', i)
}

const RESULT_LABELS = { win: 'あなたの勝ち', lose: 'ディーラーの勝ち', push: '引き分け', fold: '降りました' }
const resultLabel = (g) => RESULT_LABELS[g.status] ?? ''
// 役に使った札は勝負のあとに強調する
const inHand = (c) => !!shown.value?.result?.handCards?.includes(c)
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
      <p class="declare">
        <template v-if="shown">
          <span class="declare-label">ディーラーの宣言</span>
          <strong class="declare-hand">{{ handLabelOf(shown.declared) }}</strong>
        </template>
        <template v-else>掛金を決めて「札を配る」</template>
      </p>

      <div class="cards">
        <div class="card-group">
          <span class="group-label">公開札</span>
          <div class="card-row">
            <button
              v-for="(c, i) in shown?.publicCards ?? [null, null, null, null]"
              :key="'p' + i"
              class="card"
              :class="{
                empty: !c && shown,
                blank: !shown,
                red: cardFace(c)?.red,
                joker: cardFace(c)?.joker,
                target: raiseMode && c,
                used: shown?.result && inHand(c),
              }"
              :disabled="!(raiseMode && c) || busy"
              :aria-label="c ? `${cardFace(c).suit}${cardFace(c).label}${raiseMode ? 'を破る' : ''}` : '空札'"
              @click="onCardClick(i)"
            >
              <template v-if="c">
                <span class="card-num">{{ cardFace(c).label }}</span>
                <span class="card-suit">{{ cardFace(c).suit }}</span>
              </template>
              <span v-else-if="shown" class="card-torn">破れ</span>
            </button>
          </div>
        </div>
        <div class="card-group">
          <span class="group-label">手札</span>
          <div class="card-row">
            <template v-if="shown?.hiddenCards">
              <span
                v-for="(c, i) in shown.hiddenCards"
                :key="'h' + i"
                class="card"
                :class="{ red: cardFace(c)?.red, joker: cardFace(c)?.joker, used: inHand(c) }"
              >
                <span class="card-num">{{ cardFace(c).label }}</span>
                <span class="card-suit">{{ cardFace(c).suit }}</span>
              </span>
            </template>
            <template v-else>
              <span v-for="i in 3" :key="'b' + i" class="card back" :class="{ blank: !shown }" />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 結果 -->
    <div v-if="finished" class="result" :class="finished.status">
      <p class="result-title">{{ resultLabel(finished) }}</p>
      <template v-if="finished.result?.hand">
        <p class="result-line">
          実際の役: <strong>{{ handLabelOf(finished.result.hand) }}</strong>
          <template v-if="finished.result.bluff">(宣言は嘘でした)</template>
        </p>
        <p v-if="!finished.result.bluff" class="result-line">
          ダメージ: ディーラー {{ finished.result.dealerDamage }} / あなた {{ finished.result.playerDamage }}
          <span class="dice">({{ finished.result.dice.join('+') }})</span>
        </p>
      </template>
      <p class="result-net" :class="{ plus: finished.net > 0, minus: finished.net < 0 }">
        {{ finished.net > 0 ? '+' : '' }}{{ formatMoney(finished.net) }}
      </p>
    </div>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <!-- 勝負中の操作 -->
    <div v-if="game" class="actions">
      <p class="bet-now">掛金 {{ formatMoney(game.bet) }}<template v-if="game.raiseFeeTotal"> + 料金 {{ formatMoney(game.raiseFeeTotal) }}</template></p>
      <button class="play-btn" :disabled="busy" @click="act('call')">Call(勝負する)</button>
      <div class="sub-actions">
        <button
          class="sub-btn"
          :class="{ active: raiseMode }"
          :disabled="busy || raisesLeft === 0 || !game.publicCards.some(Boolean)"
          @click="raiseMode = !raiseMode"
        >
          Raise
          <small>{{ raiseMode ? '破る札を選んでください' : `札を1枚破る・${formatMoney(raiseFee)}(残り${raisesLeft}回)` }}</small>
        </button>
        <button class="sub-btn" :disabled="busy" @click="act('fold')">
          Check
          <small>降りる・{{ formatMoney(Math.floor(game.bet / 2)) }}が戻る</small>
        </button>
      </div>
    </div>

    <!-- 掛金と開始 -->
    <div v-else-if="selectedPc" class="bet">
      <template v-if="isLedger">
        <p class="ledger-bet-note">出納帳のPCは掛金{{ formatMoney(settings?.ledgerBet ?? 100) }}固定です</p>
      </template>
      <template v-else>
        <label class="bet-label" for="showdown-bet">掛金({{ MONEY_UNIT }})</label>
        <input id="showdown-bet" v-model.number="bet" type="number" inputmode="numeric" :step="settings?.betUnit ?? 100" :min="settings?.betUnit ?? 100" class="bet-input" />
        <div class="bet-presets">
          <button v-for="p in betPresets" :key="p" class="preset-btn" @click="bet = p">{{ formatMoney(p) }}</button>
        </div>
        <p v-if="!betValid" class="error-text">掛金は{{ formatMoney(settings?.betUnit ?? 100) }}単位で指定してください</p>
        <p v-else-if="selectedPc.money < bet" class="error-text">所持金が掛金に足りません</p>
      </template>
      <p v-if="remainingPlays === 0" class="error-text">今日はもう遊べません(1日{{ settings?.dailyLimit }}回まで)</p>
      <p class="plays-left">今日の残り: {{ remainingPlays }} / {{ settings?.dailyLimit ?? '-' }}回</p>
      <button class="play-btn" :disabled="!canStart" @click="start">{{ finished ? 'もう一度配る' : '札を配る' }}</button>
    </div>

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
    <div v-for="g in state?.recent ?? []" :key="g.id" class="history-row">
      <span class="history-date">{{ formatDateTime(g.createdAt) }}</span>
      <span class="history-name">
        {{ g.status === 'fold' ? '降りた' : handLabelOf(g.result?.hand) }}<template v-if="g.result?.bluff">(嘘を見破った)</template>
        (掛金{{ formatMoney(g.bet) }})
      </span>
      <span class="history-net" :class="{ plus: g.net > 0, minus: g.net < 0 }">{{ g.net > 0 ? '+' : '' }}{{ formatMoney(g.net) }}</span>
    </div>
    <p v-if="(state?.recent ?? []).length === 0" class="empty">まだ遊んでいません</p>
  </section>
</template>

<style scoped>
.game {
  margin-top: 24px;
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

/* 卓: 緑のフェルト */
.table {
  padding: 12px 10px 14px;
  background: #0d3b1e;
  border: 2px solid #000;
  color: #fff;
}

.declare {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin: 0 0 12px;
  min-height: 44px;
  justify-content: center;
  font-size: 0.8rem;
  opacity: 0.9;
}

.declare-label {
  font-size: 0.7rem;
  color: var(--color-accent, #ffd400);
}

.declare-hand {
  font-size: 1.3rem;
  letter-spacing: 0.08em;
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

/* 札: スマホ幅で7枚が1行に並ぶ大きさ */
.card {
  width: 40px;
  height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  border: 1px solid #000;
  border-radius: 4px;
  background: #fff;
  color: #000;
  font-family: inherit;
  font-weight: bold;
  line-height: 1;
}

.card.red {
  color: #c62828;
}

.card.joker .card-num {
  font-size: 0.55rem;
  letter-spacing: 0.02em;
}

.card-num {
  font-size: 1rem;
}

.card-suit {
  font-size: 0.95rem;
}

.card.back {
  background: repeating-linear-gradient(45deg, #7a1010 0 4px, #a51c1c 4px 8px);
  border-color: #000;
}

.card.blank {
  background: rgba(255, 255, 255, 0.12);
  border: 1px dashed rgba(255, 255, 255, 0.5);
}

.card.empty {
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.6);
  color: rgba(255, 255, 255, 0.7);
}

.card-torn {
  font-size: 0.65rem;
}

/* Raise で選べる札 */
.card.target {
  cursor: pointer;
  outline: 3px solid var(--color-accent, #ffd400);
  outline-offset: 1px;
}

.card:disabled {
  cursor: default;
}

/* 勝負のあと、役に使った札 */
.card.used {
  outline: 3px solid var(--color-accent, #ffd400);
  outline-offset: 1px;
}

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

.result-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.result-line {
  margin: 4px 0 0;
  font-size: 0.85rem;
}

.dice {
  font-size: 0.75rem;
  opacity: 0.8;
}

.result-net {
  margin: 6px 0 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.result.lose .result-net.minus {
  color: #ff8a80;
}

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
}

.play-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

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
</style>
