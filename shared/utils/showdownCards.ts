// Showdown の札と役(サーバー・画面の両方から使う純粋な関数だけを置く)
// 札は「スート1文字 + 数字」の文字列(S=♠ H=♥ D=♦ C=♣、数字は 2〜14。J=11 Q=12 K=13 A=14)と Joker('JK')
// 空札(破られた枠)は null

export const SUITS = ['S', 'H', 'D', 'C']
export const JOKER = 'JK'
export const FULL_DECK = [...SUITS.flatMap((s) => Array.from({ length: 13 }, (_, i) => `${s}${i + 2}`)), JOKER]

// 役(弱い順)。damage: 役に使う札の数字の合計にかかるダメージ倍率(魔術《Showdown》の表のとおり)
export const SHOWDOWN_HANDS = [
  { key: 'high', label: 'ハイカード', damage: 0 },
  { key: 'one_pair', label: 'ワンペア', damage: 1 },
  { key: 'two_pair', label: 'ツーペア', damage: 1 },
  { key: 'three', label: 'スリーカード', damage: 1.5 },
  { key: 'straight', label: 'ストレート', damage: 1.5 },
  { key: 'flush', label: 'フラッシュ', damage: 2 },
  { key: 'full_house', label: 'フルハウス', damage: 3 },
  { key: 'four', label: 'フォーカード', damage: 5 },
  { key: 'straight_flush', label: 'ストレートフラッシュ', damage: 6 },
  { key: 'five', label: 'ファイブカード', damage: 7 },
]
export const HAND_KEYS = SHOWDOWN_HANDS.map((h) => h.key)
// 7枚を引いたときに一番強い役がそれになる確率(%)。20万回の試行で求めた目安
export const SHOWDOWN_HAND_PROBABILITY = {
  high: 15.11, one_pair: 39.99, two_pair: 20.42, three: 8.61, straight: 7.18,
  flush: 3.88, full_house: 3.92, four: 0.72, straight_flush: 0.16, five: 0.01,
}
export const handRank = (key) => HAND_KEYS.indexOf(key)

const suitOf = (c) => c[0]
const numOf = (c) => Number(c.slice(1))

// Joker を除いた5枚(Joker の分は wild 枚)から一番強い役を作る
// 返り値: { rank, used: 役に使った札の数字の配列(Joker の分は表した数字), joker: Joker が表した数字(なければ null) }
function evalFive(cards, wild) {
  const nums = cards.map(numOf)
  const counts = new Map()
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1)
  const flush = wild + cards.length === 5 && new Set(cards.map(suitOf)).size <= 1

  // ストレート: 5連続の数字(A は 14 として扱い、A-2-3-4-5 も認める)を、Joker で穴を埋めて作れるか。一番高いものを選ぶ
  const straightHigh = () => {
    if (new Set(nums).size !== nums.length) return null
    for (let high = 14; high >= 5; high--) {
      const seq = Array.from({ length: 5 }, (_, i) => high - i).map((n) => (n === 1 ? 14 : n))
      const missing = seq.filter((n) => !nums.includes(n)).length
      if (missing <= wild && nums.every((n) => seq.includes(n))) return seq
    }
    return null
  }

  // 同じ数字の組(多い順、同数なら数字の大きい順)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const topNum = groups[0]?.[0] ?? 14
  const topCount = (groups[0]?.[1] ?? 0) + wild
  const second = groups[1]
  const sum = (arr) => arr.reduce((a, b) => a + b, 0)
  const rep = (n, k) => Array.from({ length: k }, () => n)

  const seq = straightHigh()
  if (topCount >= 5) return { rank: 9, used: rep(topNum, 5), joker: wild ? topNum : null }
  if (seq && flush) return { rank: 8, used: seq, joker: wild ? seq.find((n) => !nums.includes(n)) : null }
  if (topCount === 4) return { rank: 7, used: rep(topNum, 4), joker: wild ? topNum : null }
  if (topCount === 3 && second?.[1] === 2) return { rank: 6, used: [...rep(topNum, 3), ...rep(second[0], 2)], joker: wild ? topNum : null }
  if (flush) {
    // Joker は A(14)として足す(同じ数字が出ても数字の合計が一番大きくなる)
    return { rank: 5, used: [...nums, ...rep(14, wild)], joker: wild ? 14 : null }
  }
  if (seq) return { rank: 4, used: seq, joker: wild ? seq.find((n) => !nums.includes(n)) : null }
  if (topCount === 3) return { rank: 3, used: rep(topNum, 3), joker: wild ? topNum : null }
  if (topCount === 2 && second?.[1] === 2) return { rank: 2, used: [...rep(topNum, 2), ...rep(second[0], 2)], joker: wild ? topNum : null }
  if (topCount === 2) return { rank: 1, used: rep(topNum, 2), joker: wild ? topNum : null }
  return { rank: 0, used: [], joker: null, sum: sum(nums) }
}

// 5枚のうち、役に使った札(ワンペアなら2枚)。Joker を使っていれば Joker も含む
function roleCardsOf(five, r) {
  const need = [...r.used]
  if (r.joker !== null) need.splice(need.indexOf(r.joker), 1)
  const out = []
  for (const c of five) {
    if (c === JOKER) {
      if (r.joker !== null) out.push(c)
      continue
    }
    const i = need.indexOf(numOf(c))
    if (i !== -1) {
      need.splice(i, 1)
      out.push(c)
    }
  }
  return out
}

const combinations = (arr, k) => {
  const out = []
  const rec = (start, picked) => {
    if (picked.length === k) return out.push(picked)
    for (let i = start; i < arr.length; i++) rec(i + 1, [...picked, arr[i]])
  }
  rec(0, [])
  return out
}

// 7枚(空札は除く)から一番強い5枚の役を返す。同じ役なら、役に使う札の数字の合計(=ダメージの元)が大きい方
// 返り値: { key, label, rank, cards: 選んだ5枚, sum: 役に使った札の数字の合計, damage: 合計 × ダメージ倍率 }
export function bestHand(cards) {
  const present = cards.filter(Boolean)
  const k = Math.min(5, present.length)
  let best = null
  for (const five of combinations(present, k)) {
    const plain = five.filter((c) => c !== JOKER)
    const r = evalFive(plain, five.length - plain.length)
    const sum = r.used.reduce((a, b) => a + b, 0)
    if (!best || r.rank > best.rank || (r.rank === best.rank && sum > best.sum)) {
      best = { rank: r.rank, sum, cards: five, roleCards: roleCardsOf(five, r) }
    }
  }
  if (!best) best = { rank: 0, sum: 0, cards: [], roleCards: [] }
  const hand = SHOWDOWN_HANDS[best.rank]
  return {
    key: hand.key, label: hand.label, rank: best.rank, cards: best.cards, roleCards: best.roleCards,
    sum: best.sum, damage: Math.round(best.sum * hand.damage),
  }
}

// 画面の表示用: 'H12' → { suit: '♥', label: 'Q', red: true }
const SUIT_MARK = { S: '♠', H: '♥', D: '♦', C: '♣' }
const NUM_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
export function cardFace(c) {
  if (!c) return null
  if (c === JOKER) return { suit: '', label: 'JOKER', red: false, joker: true }
  const n = numOf(c)
  return { suit: SUIT_MARK[suitOf(c)], label: NUM_LABEL[n] ?? String(n), red: c[0] === 'H' || c[0] === 'D', joker: false }
}
