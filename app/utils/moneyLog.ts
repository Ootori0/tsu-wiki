// 所持金の履歴の表示用
export const MONEY_LOG_KIND_LABELS = {
  manual: '手動',
  purchase: '購入',
  sale: '売上',
  casino: 'カジノ',
  dealer: 'ディーラー',
  settle: '清算',
  mode: '切替',
}

export function describeMoneyLog(log) {
  switch (log.kind) {
    case 'manual':
    case 'settle':
    case 'mode': return log.detail
    case 'purchase':
    case 'sale': return `[${log.sub.split(' ')[0]}] ${log.detail} ${log.sub.split(' ')[1] ?? ''}`
    case 'casino': return `チンチロ ${handLabel(log.detail)}(掛金${formatMoney(log.sub)})`
    case 'dealer': return `チンチロ ${log.sub ?? '(削除済みPC)'}の${handLabel(log.detail)}`
    default: return log.detail
  }
}

// 所持金の欄の呼び方(出納帳のPCは「未清算」)
export function moneyLabel(pc) {
  return pc?.money_mode === 'ledger' ? '未清算' : '所持金'
}

// 出納帳の未清算額は符号付きで表示する
export function formatBalance(pc) {
  const v = pc?.money ?? 0
  return pc?.money_mode === 'ledger' && v > 0 ? `+${formatMoney(v)}` : formatMoney(v)
}
