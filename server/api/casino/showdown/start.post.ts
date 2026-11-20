import { requirePlayablePc } from '../../../utils/showdownAccess'
import { loadShowdownSettings, startGame, publicGame, closeLegacyGames } from '../../../utils/showdown'
import { todayStartUtc } from '../../../utils/chinchiro'

// 勝負を始める: ディーラーが札を配って宣言する(掛金はなく、終わったときに MP の差で精算する)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { pcId } = (await readBody(event)) ?? {}
  const { currentUser, pc } = await requirePlayablePc(event, db, Number(pcId))

  const settings = await loadShowdownSettings(event, db)
  const { state, events } = startGame(settings)

  try {
    await db.batch([
      ...closeLegacyGames(db, pc.id),
      // 1日の回数を CHECK 制約で確かめる(超えていればバッチ全体が取り消される)
      db
        .prepare('INSERT INTO balance_checks (money) SELECT ? - 1 - COUNT(*) FROM showdown_games WHERE pc_id = ? AND created_at >= ?')
        .bind(settings.dailyLimit, pc.id, todayStartUtc()),
      db.prepare('DELETE FROM balance_checks'),
      // 進行中の勝負は1つまで(一意インデックスで確かめる)
      db
        .prepare(
          `INSERT INTO showdown_games (pc_id, bet, cards, declared, net, played_by, player_mp, dealer_mp, log)
           VALUES (?, 0, ?, ?, 0, ?, ?, ?, ?)`
        )
        .bind(pc.id, JSON.stringify(state.cards), state.declared, currentUser.id, state.playerMp, state.dealerMp, JSON.stringify(events)),
    ])
  } catch {
    throw createError({ statusCode: 409, statusMessage: '今日の回数の上限に達したか、勝負の途中です' })
  }

  const row = await db.prepare("SELECT * FROM showdown_games WHERE pc_id = ? AND status = 'playing'").bind(pc.id).first()
  return { game: publicGame(row), events }
})
