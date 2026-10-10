// チンチロ(賭博黙示録カイジの地下チンチロのルールを1人用に簡略化)
// サイコロ3つを最大3回振り、役が出た時点で終了。3回とも役なしなら「目なし」
// 倍率は掛金に対する所持金の増減(マイナスは負け)

export const CHINCHIRO_HANDS = [
  'pinzoro', 'zorome', 'shigoro',
  'point6', 'point5', 'point4', 'point3', 'point2', 'point1',
  'menashi', 'hifumi',
]

export const DEFAULT_PAYOUTS = {
  pinzoro: 5,
  zorome: 3,
  shigoro: 2,
  point6: 1,
  point5: 0.5,
  point4: 0,
  point3: -0.5,
  point2: -0.75,
  point1: -1,
  menashi: -1,
  hifumi: -2,
}

export const BET_UNIT = 100 // 掛金は100万円単位(所持金は万円単位)
export const MAX_ROLLS = 3

// 出目から役を判定(役なしは null)
export function judgeRoll(dice) {
  const [a, b, c] = [...dice].sort((x, y) => x - y)
  if (a === b && b === c) return a === 1 ? 'pinzoro' : 'zorome'
  if (a === 4 && b === 5 && c === 6) return 'shigoro'
  if (a === 1 && b === 2 && c === 3) return 'hifumi'
  if (a === b) return `point${c}`
  if (b === c) return `point${a}`
  return null
}

function rollDie() {
  // 偏りのない 1〜6 (252以上は捨てる)
  const buf = new Uint8Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0] >= 252)
  return (buf[0] % 6) + 1
}

export function playChinchiro() {
  const rolls = []
  for (let i = 0; i < MAX_ROLLS; i++) {
    const dice = [rollDie(), rollDie(), rollDie()]
    rolls.push(dice)
    const hand = judgeRoll(dice)
    if (hand) return { rolls, hand }
  }
  return { rolls, hand: 'menashi' }
}

export async function loadPayouts(db) {
  const { results } = await db.prepare('SELECT hand, multiplier FROM chinchiro_payouts').all()
  const payouts = { ...DEFAULT_PAYOUTS }
  for (const r of results) {
    if (r.hand in payouts) payouts[r.hand] = r.multiplier
  }
  return payouts
}
