// 所持金の履歴の表示用
export const MONEY_LOG_KIND_LABELS = {
  manual: '手動',
  purchase: '購入',
  sale: '売上',
  casino: 'カジノ',
  dealer: 'ディーラー',
}

export function describeMoneyLog(log) {
  switch (log.kind) {
    case 'manual': return log.detail
    case 'purchase':
    case 'sale': return `[${log.sub.split(' ')[0]}] ${log.detail} ${log.sub.split(' ')[1] ?? ''}`
    case 'casino': return `チンチロ ${handLabel(log.detail)}(掛金${formatMoney(log.sub)})`
    case 'dealer': return `チンチロ ${log.sub ?? '(削除済みPC)'}の${handLabel(log.detail)}`
    default: return log.detail
  }
}
