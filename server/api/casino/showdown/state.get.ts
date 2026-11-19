import { requirePlayablePc } from '../../../utils/showdownAccess'
import { loadShowdownSettings, countShowdownToday, publicGame } from '../../../utils/showdown'
import { BET_UNIT, LEDGER_BET } from '../../../utils/chinchiro'

// Showdown の画面に出すもの: 設定(配当など。嘘の確率は出さない)・進行中の勝負・最近の勝負・今日の回数
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const pcId = Number(getQuery(event).pcId)
  await requirePlayablePc(event, db, pcId)

  const settings = await loadShowdownSettings(event, db)
  const [{ results: active }, { results: recent }, { results: [{ c: playsToday }] }] = await db.batch([
    db.prepare("SELECT * FROM showdown_games WHERE pc_id = ? AND status = 'playing'").bind(pcId),
    db
      .prepare("SELECT * FROM showdown_games WHERE pc_id = ? AND status != 'playing' ORDER BY created_at DESC, id DESC LIMIT 20")
      .bind(pcId),
    countShowdownToday(db, pcId),
  ])

  return {
    settings: {
      payouts: settings.payouts,
      raiseFee: settings.raiseFee,
      raiseMax: settings.raiseMax,
      dailyLimit: settings.dailyLimit,
      diceCount: settings.diceCount,
      diceSides: settings.diceSides,
      dealerPcName: settings.dealerPcName,
      betUnit: BET_UNIT,
      ledgerBet: LEDGER_BET,
    },
    game: publicGame(active[0]),
    recent: recent.map(publicGame),
    playsToday,
  }
})
