export const CHINCHIRO_HANDS = [
  { key: 'pinzoro', label: 'ピンゾロ', desc: '1・1・1' },
  { key: 'zorome', label: 'ゾロ目', desc: '2・2・2 〜 6・6・6' },
  { key: 'shigoro', label: 'シゴロ', desc: '4・5・6' },
  { key: 'point6', label: '6の目', desc: '2つ揃い+6' },
  { key: 'point5', label: '5の目', desc: '2つ揃い+5' },
  { key: 'point4', label: '4の目', desc: '2つ揃い+4' },
  { key: 'point3', label: '3の目', desc: '2つ揃い+3' },
  { key: 'point2', label: '2の目', desc: '2つ揃い+2' },
  { key: 'point1', label: '1の目', desc: '2つ揃い+1' },
  { key: 'menashi', label: '目なし', desc: '3回振って役なし' },
  { key: 'hifumi', label: 'ヒフミ', desc: '1・2・3' },
]

export function handLabel(key) {
  return CHINCHIRO_HANDS.find((h) => h.key === key)?.label ?? key
}

// 1回振ったときの各役の確率(216通り中)。役が出る確率は1/2
const PER_ROLL = {
  pinzoro: 1, zorome: 5, shigoro: 6, hifumi: 6,
  point6: 15, point5: 15, point4: 15, point3: 15, point2: 15, point1: 15,
}

// 最大3回振ったときに最終的にその役になる確率
export function handProbability(key) {
  if (key === 'menashi') return 1 / 8
  return (PER_ROLL[key] / 216) * (1 + 1 / 2 + 1 / 4)
}

// 掛金に対する期待収支(倍率)。0未満ならカジノ有利
export function expectedReturn(payouts) {
  return CHINCHIRO_HANDS.reduce(
    (sum, h) => sum + handProbability(h.key) * Number(payouts?.[h.key] ?? 0),
    0
  )
}

// 表示用の払い戻し倍率。内部の倍率(所持金の増減)に1を足し、-1倍(全額負け)を0倍として表示する
export function formatMultiplier(value) {
  const n = Math.round((Number(value ?? 0) + 1) * 100) / 100
  return `${n}倍`
}
