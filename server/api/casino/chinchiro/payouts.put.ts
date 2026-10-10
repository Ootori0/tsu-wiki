import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { CHINCHIRO_HANDS } from '../../../utils/chinchiro'
import { invalidateCache } from '../../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const { payouts, dealerPcId, dealerShare } = (await readBody(event)) ?? {}

  const share = Number(dealerShare ?? 100)
  if (!Number.isInteger(share) || share < 0 || share > 100) {
    throw createError({ statusCode: 400, statusMessage: 'ディーラーの割合は0〜100の整数で指定してください' })
  }
  const dealerId = dealerPcId === null || dealerPcId === undefined || dealerPcId === '' ? null : Number(dealerPcId)
  if (dealerId !== null) {
    const pc = await db.prepare('SELECT id FROM pcs WHERE id = ?').bind(dealerId).first()
    if (!pc) {
      throw createError({ statusCode: 400, statusMessage: 'ディーラーのPCが見つかりません' })
    }
  }

  const statements = CHINCHIRO_HANDS.map((hand) => {
    const raw = Number(payouts?.[hand])
    // 掛金が100万円単位なので小数第2位までなら増減額は整数(万円)になる
    if (!Number.isFinite(raw) || Math.abs(Math.round(raw * 100) - raw * 100) > 1e-9) {
      throw createError({ statusCode: 400, statusMessage: '倍率は小数第2位までの数値で指定してください' })
    }
    const value = Math.round(raw * 100) / 100
    return db
      .prepare(
        `INSERT INTO chinchiro_payouts (hand, multiplier) VALUES (?, ?)
         ON CONFLICT(hand) DO UPDATE SET multiplier = excluded.multiplier`
      )
      .bind(hand, value)
  })

  const setting = (key, value) =>
    db
      .prepare(
        `INSERT INTO casino_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .bind(key, value)

  await db.batch([
    ...statements,
    setting('dealer_pc_id', dealerId === null ? null : String(dealerId)),
    setting('dealer_share', String(share)),
  ])
  invalidateCache('casino:payouts', 'casino:dealer')

  return { success: true }
})
