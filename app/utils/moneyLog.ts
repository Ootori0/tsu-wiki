// 所持金の履歴の表示用
export const MONEY_LOG_KIND_LABELS = {
  manual: '手動',
  purchase: '購入',
  sale: '売上',
  casino: 'カジノ',
  dealer: 'ディーラー',
  casino_month: 'カジノ月計',
  dealer_month: 'ディーラー月計',
  showdown: 'Showdown',
  showdown_dealer: 'ディーラー',
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
    // 圧縮した古い勝負の月計(detail/sub は「/」区切り)
    case 'casino_month': {
      const [plays, bet] = String(log.sub).split('/')
      return `チンチロ ${monthLabel(log.detail)}の${plays}回分(掛金計${formatMoney(Number(bet))})`
    }
    case 'dealer_month': {
      const [month, plays] = String(log.detail).split('/')
      return `チンチロ ディーラーとして${monthLabel(month)}の${plays}回分(${log.sub}人)`
    }
    case 'showdown': return Number(log.sub) > 0 ? `Showdown ${showdownResultLabel(log.detail)}(掛金${formatMoney(log.sub)})` : `Showdown ${showdownResultLabel(log.detail)}`
    case 'showdown_dealer': return `Showdown ${log.sub ?? '(削除済みPC)'}の${showdownResultLabel(log.detail)}`
    default: return log.detail
  }
}

// Showdown の履歴の表示: 結果(MP の削り合いの勝負)、または以前の形の勝負の役
const SHOWDOWN_RESULT_LABELS = { win: '勝ち', lose: '負け', push: '引き分け', fold: '投了', playing: '勝負中' }
function showdownResultLabel(detail) {
  return SHOWDOWN_RESULT_LABELS[detail] ?? SHOWDOWN_HANDS.find((h) => h.key === detail)?.label ?? detail
}

// 'YYYY-MM' → 'YYYY年M月'
function monthLabel(month) {
  const [y, m] = String(month).split('-')
  return `${y}年${Number(m)}月`
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
