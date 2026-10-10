import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

// pcId指定: そのPCの取引履歴(購入=支出、販売者としての収入)(作成者/admin)
// 指定なし: 全購入履歴と販売者への支払い(adminのみ)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { pcId } = getQuery(event)
  const admin = isAdmin(currentUser.permissions)

  if (!pcId) {
    if (!admin) {
      throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
    }
    const [{ results: purchases }, { results: payouts }] = await db.batch([
      db.prepare(
        `SELECT purchases.*, pcs.name AS pc_name FROM purchases
         LEFT JOIN pcs ON pcs.id = purchases.pc_id
         ORDER BY purchases.id DESC LIMIT 100`
      ),
      db.prepare(
        `SELECT p.purchase_id, p.amount, pcs.name AS pc_name FROM purchase_payouts p
         LEFT JOIN pcs ON pcs.id = p.pc_id
         WHERE p.purchase_id >= (SELECT COALESCE(MIN(id), 0) FROM (SELECT id FROM purchases ORDER BY id DESC LIMIT 100))
         ORDER BY p.id ASC`
      ),
    ])
    return purchases.map((p) => ({
      ...p,
      payouts: payouts.filter((po) => po.purchase_id === p.id),
    }))
  }

  const pc = await db.prepare('SELECT created_by FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !admin) {
    throw createError({ statusCode: 403, statusMessage: '閲覧権限がありません' })
  }

  const { results } = await db
    .prepare(
      `SELECT * FROM (
         SELECT 'purchase' AS kind, id, shop, item_name, quantity, -total AS amount, created_at
         FROM purchases WHERE pc_id = ?
         UNION ALL
         SELECT 'sale' AS kind, po.id, pu.shop, pu.item_name, pu.quantity, po.amount AS amount, po.created_at
         FROM purchase_payouts po JOIN purchases pu ON pu.id = po.purchase_id
         WHERE po.pc_id = ?
       ) ORDER BY created_at DESC, id DESC LIMIT 50`
    )
    .bind(pcId, pcId)
    .all()
  return results
})
