import { requirePlayablePc } from '../../../utils/showdownAccess'
import { loadShowdownSettings, newGameCards, declareHand, publicGame } from '../../../utils/showdown'
import { BET_UNIT, LEDGER_BET, todayStartUtc } from '../../../utils/chinchiro'

// 掛金を払って札を配る(The Flop)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { pcId, bet } = (await readBody(event)) ?? {}
  const { currentUser, pc } = await requirePlayablePc(event, db, Number(pcId))

  const isLedger = pc.money_mode === 'ledger'
  const betNum = isLedger ? LEDGER_BET : Number(bet)
  if (!Number.isInteger(betNum) || betNum < BET_UNIT || betNum % BET_UNIT !== 0) {
    throw createError({ statusCode: 400, statusMessage: `掛金は${BET_UNIT}万円単位で指定してください` })
  }
  if (!isLedger && pc.money < betNum) {
    throw createError({ statusCode: 409, statusMessage: '所持金が掛金に足りません' })
  }

  const settings = await loadShowdownSettings(event, db)
  const cards = newGameCards()
  const declared = declareHand(cards, settings.bluffRate)

  try {
    await db.batch([
      // 所持金と1日の回数を CHECK 制約で確かめる(足りなければバッチ全体が取り消される)
      ...(isLedger ? [] : [db.prepare('INSERT INTO balance_checks (money) SELECT money - ? FROM pcs WHERE id = ?').bind(betNum, pc.id)]),
      db
        .prepare('INSERT INTO balance_checks (money) SELECT ? - 1 - COUNT(*) FROM showdown_games WHERE pc_id = ? AND created_at >= ?')
        .bind(settings.dailyLimit, pc.id, todayStartUtc()),
      db.prepare('DELETE FROM balance_checks'),
      db.prepare("UPDATE pcs SET money = money - ?, updated_at = datetime('now') WHERE id = ?").bind(betNum, pc.id),
      // 進行中の勝負は1つまで(一意インデックスで確かめる)
      db
        .prepare('INSERT INTO showdown_games (pc_id, bet, cards, declared, net, played_by) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(pc.id, betNum, JSON.stringify(cards), declared, -betNum, currentUser.id),
    ])
  } catch {
    throw createError({ statusCode: 409, statusMessage: '所持金が足りないか、今日の回数の上限に達したか、勝負の途中です' })
  }

  const row = await db.prepare("SELECT * FROM showdown_games WHERE pc_id = ? AND status = 'playing'").bind(pc.id).first()
  return { game: publicGame(row) }
})
