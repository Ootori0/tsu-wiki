import { requirePlayablePc } from '../../../utils/showdownAccess'
import { loadShowdownSettings, countShowdownToday, publicGame, closeLegacyGames } from '../../../utils/showdown'

// Showdown の画面に出すもの: 設定(嘘の確率などは出さない)・進行中の勝負・最近の勝負・今日の回数
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const pcId = Number(getQuery(event).pcId)
  await requirePlayablePc(event, db, pcId)

  const settings = await loadShowdownSettings(event, db)
  await db.batch(closeLegacyGames(db, pcId))
  const [{ results: active }, { results: recent }, { results: [{ c: playsToday }] }] = await db.batch([
    db.prepare("SELECT * FROM showdown_games WHERE pc_id = ? AND status = 'playing'").bind(pcId),
    db
      .prepare("SELECT * FROM showdown_games WHERE pc_id = ? AND status != 'playing' ORDER BY created_at DESC, id DESC LIMIT 20")
      .bind(pcId),
    countShowdownToday(db, pcId),
  ])

  return {
    settings: {
      skill: settings.skill,
      playerMp: settings.playerMp,
      dealerMp: settings.dealerMp,
      playerDice: settings.playerDice,
      dealerDice: settings.dealerDice,
      playerAttackCost: settings.playerAttackCost,
      dealerAttackCost: settings.dealerAttackCost,
      rate: settings.rate,
      dailyLimit: settings.dailyLimit,
      dealerPcName: settings.dealerPcName,
    },
    game: publicGame(active[0]),
    recent: recent.map(publicGame),
    playsToday,
  }
})
