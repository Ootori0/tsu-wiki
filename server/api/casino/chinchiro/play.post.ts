import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { BET_UNIT, loadPayouts, playChinchiro } from '../../../utils/chinchiro'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { pcId, bet } = (await readBody(event)) ?? {}
  const betNum = Number(bet)
  if (!Number.isInteger(betNum) || betNum < BET_UNIT || betNum % BET_UNIT !== 0) {
    throw createError({ statusCode: 400, statusMessage: '掛金は100万円単位で指定してください' })
  }

  const pc = await db.prepare('SELECT id, created_by, money FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '自分のPCでのみ遊べます' })
  }
  if (pc.money < betNum) {
    throw createError({ statusCode: 409, statusMessage: '所持金が掛金に足りません' })
  }

  const payouts = await loadPayouts(db)
  const { rolls, hand } = playChinchiro()
  const multiplier = payouts[hand]
  const net = Math.round(betNum * multiplier)

  // 掛金分の所持金があることを条件に増減(負けで所持金がマイナスになるのは許容)
  const result = await db
    .prepare('UPDATE pcs SET money = money + ?, updated_at = datetime(\'now\') WHERE id = ? AND money >= ?')
    .bind(net, pc.id, betNum)
    .run()
  if (!result.meta.changes) {
    throw createError({ statusCode: 409, statusMessage: '所持金が掛金に足りません' })
  }

  await db
    .prepare(
      `INSERT INTO chinchiro_games (pc_id, bet, rolls, hand, multiplier, net, played_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(pc.id, betNum, JSON.stringify(rolls), hand, multiplier, net, currentUser.id)
    .run()

  const updated = await db.prepare('SELECT money FROM pcs WHERE id = ?').bind(pc.id).first()
  return { rolls, hand, multiplier, net, money: updated.money }
})
