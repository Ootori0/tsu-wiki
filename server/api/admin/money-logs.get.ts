import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

// 全PCの所持金の増減履歴(手動・店の購入/売上・カジノ・ディーラー)。pcId を指定するとそのPCだけ
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const query = getQuery(event)
  const pcId = query.pcId ? Number(query.pcId) : null

  const { results } = await db
    .prepare(
      `SELECT l.*, pcs.name AS pc_name, u.name AS user_name FROM (
         SELECT 'manual' AS kind, id, pc_id, amount, reason AS detail, NULL AS sub, created_by AS user_id, created_at
         FROM money_logs
         UNION ALL
         SELECT 'purchase', id, pc_id, -total, item_name, shop || ' ×' || quantity, purchased_by, created_at
         FROM purchases
         UNION ALL
         SELECT 'sale', po.id, po.pc_id, po.amount, pu.item_name, pu.shop || ' ×' || pu.quantity, pu.purchased_by, po.created_at
         FROM purchase_payouts po JOIN purchases pu ON pu.id = po.purchase_id
         UNION ALL
         SELECT 'casino', id, pc_id, net, hand, bet, played_by, created_at
         FROM chinchiro_games
         UNION ALL
         SELECT 'dealer', g.id, g.dealer_pc_id, g.dealer_delta, g.hand, p.name, g.played_by, g.created_at
         FROM chinchiro_games g LEFT JOIN pcs p ON p.id = g.pc_id
         WHERE g.dealer_pc_id IS NOT NULL
       ) l
       LEFT JOIN pcs ON pcs.id = l.pc_id
       LEFT JOIN users u ON u.id = l.user_id
       WHERE ?1 IS NULL OR l.pc_id = ?1
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 200`
    )
    .bind(pcId)
    .all()

  return results
})
