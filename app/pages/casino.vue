<script setup>
definePageMeta({ middleware: 'auth' })

const { myPcs, refreshMyPcs, selectedPcId, selectedPc } = await useMyPcs()

const { data: payoutData } = await useFetch('/api/casino/chinchiro/payouts', {
  key: 'chinchiro-payouts',
})
const betUnit = computed(() => payoutData.value?.betUnit ?? 100)

const { data: games, refresh: refreshGames } = await useFetch('/api/casino/chinchiro/games', {
  key: 'chinchiro-games',
  query: computed(() => ({ pcId: selectedPcId.value })),
  immediate: !!selectedPcId.value,
  watch: [selectedPcId],
})

const bet = ref(100)
const betPresets = [100, 500, 1000]

const playing = ref(false)
const errorMessage = ref('')
const shownRolls = ref([]) // 演出で表示済みの出目
const rollingDice = ref(null) // 振っている最中の仮の出目
const result = ref(null)

const betValid = computed(() =>
  Number.isInteger(bet.value) && bet.value >= betUnit.value && bet.value % betUnit.value === 0
)
const canPlay = computed(() =>
  !!selectedPc.value && betValid.value && selectedPc.value.money >= bet.value && !playing.value
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomDice = () => Array.from({ length: 3 }, () => Math.floor(Math.random() * 6) + 1)

const play = async () => {
  if (!canPlay.value) return
  errorMessage.value = ''
  result.value = null
  shownRolls.value = []
  playing.value = true

  try {
    const res = await $fetch('/api/casino/chinchiro/play', {
      method: 'POST',
      body: { pcId: selectedPc.value.id, bet: bet.value },
    })

    // 1投ずつ転がす演出
    for (const dice of res.rolls) {
      const timer = setInterval(() => { rollingDice.value = randomDice() }, 80)
      await sleep(700)
      clearInterval(timer)
      rollingDice.value = null
      shownRolls.value.push(dice)
      await sleep(350)
    }
    result.value = res
  } catch (e) {
    errorMessage.value = e?.data?.statusMessage ?? 'エラーが発生しました'
  } finally {
    rollingDice.value = null
    playing.value = false
    await Promise.all([refreshMyPcs(), refreshGames()])
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">カジノ[アーリア]</h1>

    <p v-if="(myPcs ?? []).length === 0" class="notice">
      遊ぶにはマイページでPCを作成してください
    </p>
    <PcWallet v-else v-model="selectedPcId" :pcs="myPcs ?? []" :pc="selectedPc" />

    <section class="game">
      <h2 class="game-title">チンチロ</h2>
      <p class="game-rule">
        サイコロ3つを最大3回振り、役が出た時点で決着。3回とも役なしなら「目なし」。
      </p>

      <!-- 盤面 -->
      <div class="bowl">
        <div v-for="(dice, i) in shownRolls" :key="i" class="roll-row">
          <span class="roll-no">{{ i + 1 }}投目</span>
          <div class="dice">
            <ChinchiroDie v-for="(d, j) in dice" :key="j" :value="d" />
          </div>
        </div>
        <div v-if="rollingDice" class="roll-row">
          <span class="roll-no">{{ shownRolls.length + 1 }}投目</span>
          <div class="dice">
            <ChinchiroDie v-for="(d, j) in rollingDice" :key="j" :value="d" rolling />
          </div>
        </div>
        <p v-if="!playing && shownRolls.length === 0" class="bowl-empty">掛金を決めて「振る」</p>
      </div>

      <!-- 結果 -->
      <div v-if="result" class="result" :class="{ win: result.net > 0, lose: result.net < 0 }">
        <span class="result-hand">{{ handLabel(result.hand) }}</span>
        <span class="result-mult">{{ formatMultiplier(result.multiplier) }}</span>
        <span class="result-net">
          {{ result.net > 0 ? '+' : '' }}{{ formatMoney(result.net) }}
        </span>
      </div>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <!-- 掛金 -->
      <div class="bet">
        <label class="bet-label">掛金({{ betUnit }}{{ MONEY_UNIT }}単位)</label>
        <div class="bet-row">
          <input
            v-model.number="bet"
            type="number"
            :min="betUnit"
            :step="betUnit"
            class="bet-input"
            :disabled="playing"
          />
          <span class="bet-unit">{{ MONEY_UNIT }}</span>
        </div>
        <div class="bet-presets">
          <button
            v-for="p in betPresets"
            :key="p"
            class="preset-btn"
            :disabled="playing"
            @click="bet = p"
          >
            {{ formatMoney(p) }}
          </button>
        </div>
        <p v-if="!betValid" class="error-text">掛金は{{ formatMoney(betUnit) }}単位で指定してください</p>
        <p v-else-if="selectedPc && selectedPc.money < bet" class="error-text">所持金が掛金に足りません</p>
        <button class="play-btn" :disabled="!canPlay" @click="play">
          {{ playing ? '振っています…' : '振る' }}
        </button>
      </div>

      <!-- 配当表 -->
      <details class="payouts">
        <summary>配当表</summary>
        <table class="payout-table">
          <tr v-for="h in CHINCHIRO_HANDS" :key="h.key">
            <th>{{ h.label }}</th>
            <td class="payout-desc">{{ h.desc }}</td>
            <td
              class="payout-mult"
              :class="{ plus: payoutData?.payouts?.[h.key] > 0, minus: payoutData?.payouts?.[h.key] < 0 }"
            >
              {{ formatMultiplier(payoutData?.payouts?.[h.key]) }}
            </td>
          </tr>
        </table>
        <p class="payout-note">倍率は掛金に対する所持金の増減です。負けで所持金がマイナスになることがあります。</p>
      </details>
    </section>

    <section v-if="selectedPc" class="history">
      <h2 class="history-title">{{ selectedPc.name }}の戦績(最新20件)</h2>
      <div v-for="g in games ?? []" :key="g.id" class="history-row">
        <span class="history-date">{{ formatDateTime(g.created_at) }}</span>
        <span class="history-name">{{ handLabel(g.hand) }}(掛金{{ formatMoney(g.bet) }})</span>
        <span class="history-net" :class="{ plus: g.net > 0, minus: g.net < 0 }">
          {{ g.net > 0 ? '+' : '' }}{{ formatMoney(g.net) }}
        </span>
      </div>
      <p v-if="(games ?? []).length === 0" class="notice">まだ遊んでいません</p>
    </section>
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

.notice {
  font-size: 0.85rem;
  opacity: 0.6;
}

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

.bowl {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: #0d3b1e;
  border: 2px solid #000;
  border-radius: 50% / 22%;
}

.roll-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.roll-no {
  width: 40px;
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--color-accent, #ffd400);
}

.dice {
  display: flex;
  gap: 8px;
}

.bowl-empty {
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.result {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 12px;
  padding: 10px;
  border: 2px solid #000;
  background: #eee;
  color: #000;
}

.result.win {
  background: var(--color-accent, #ffd400);
}

.result.lose {
  background: #000;
  color: #fff;
}

.result-hand {
  font-size: 1.3rem;
  font-weight: bold;
}

.result-mult {
  font-size: 0.85rem;
}

.result-net {
  font-size: 1.1rem;
  font-weight: bold;
}

.error-text {
  margin: 8px 0 0;
  font-size: 0.8rem;
  font-weight: bold;
  color: #c00;
}

.bet {
  margin-top: 14px;
}

.bet-label {
  display: block;
  font-size: 0.75rem;
  font-weight: bold;
}

.bet-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.bet-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 8px;
  font-size: 1rem;
  text-align: right;
}

.bet-unit {
  font-size: 0.85rem;
}

.bet-presets {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.preset-btn {
  flex: 1;
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 5px 0;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.play-btn {
  width: 100%;
  margin-top: 12px;
  border: 2px solid #000;
  background: var(--color-accent, #ffd400);
  color: #000;
  padding: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  letter-spacing: 0.2em;
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

.payout-table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
}

.payout-table th,
.payout-table td {
  padding: 5px 4px;
  border-bottom: 1px dashed var(--color-text, #000);
  text-align: left;
}

.payout-desc {
  font-size: 0.72rem;
  opacity: 0.7;
}

.payout-mult {
  text-align: right !important;
  font-weight: bold;
  white-space: nowrap;
}

.plus {
  color: #080;
}

.minus {
  color: #c00;
}

.payout-note {
  margin: 6px 0 0;
  font-size: 0.7rem;
  opacity: 0.6;
}

.history {
  margin-top: 28px;
}

.history-title {
  font-size: 0.95rem;
  margin: 0 0 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--color-text, #000);
}

.history-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-text, #000);
  font-size: 0.8rem;
}

.history-date {
  font-size: 0.7rem;
  opacity: 0.6;
}

.history-net {
  font-weight: bold;
  white-space: nowrap;
}
</style>
