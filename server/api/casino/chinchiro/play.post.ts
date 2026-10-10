import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { BET_UNIT, loadPayouts, loadDealer, dealerDeltaOf, playChinchiro } from '../../../utils/chinchiro'

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
  const dealer = await loadDealer(db)
  const { rolls, hand } = playChinchiro()
  const multiplier = payouts[hand]
  const net = Math.round(betNum * multiplier)

  // ディーラー自身が遊ぶ場合はディーラーとしての増減なし
  const dealerPcId = dealer.pcId && dealer.pcId !== pc.id ? dealer.pcId : null
  const dealerDelta = dealerPcId ? dealerDeltaOf(net, dealer.share) : 0

  // 掛金分の所持金があることを balance_checks の CHECK 制約で確かめてから増減する
  // (足りなければバッチ全体がロールバック。負けで所持金がマイナスになるのは許容)
  try {
    await db.batch([
      db.prepare('INSERT INTO balance_checks (money) SELECT money - ? FROM pcs WHERE id = ?').bind(betNum, pc.id),
      db.prepare('DELETE FROM balance_checks'),
      db
        .prepare('UPDATE pcs SET money = money + ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(net, pc.id),
      ...(dealerPcId
        ? [
            db
              .prepare('UPDATE pcs SET money = money + ?, updated_at = datetime(\'now\') WHERE id = ?')
              .bind(dealerDelta, dealerPcId),
          ]
        : []),
      db
        .prepare(
          `INSERT INTO chinchiro_games (pc_id, bet, rolls, hand, multiplier, net, dealer_pc_id, dealer_delta, played_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(pc.id, betNum, JSON.stringify(rolls), hand, multiplier, net, dealerPcId, dealerDelta, currentUser.id),
    ])
  } catch {
    throw createError({ statusCode: 409, statusMessage: '所持金が掛金に足りません' })
  }

  const updated = await db.prepare('SELECT money FROM pcs WHERE id = ?').bind(pc.id).first()
  return {
    rolls,
    hand,
    multiplier,
    net,
    money: updated.money,
    dealer: dealerPcId ? { pcName: dealer.pcName, delta: dealerDelta } : null,
  }
})
