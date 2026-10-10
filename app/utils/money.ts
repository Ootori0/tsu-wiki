export const MONEY_UNIT = '円'

export function formatMoney(value) {
  return `${Number(value ?? 0).toLocaleString('ja-JP')}${MONEY_UNIT}`
}
