import { getSessionUser } from '../../utils/session'
import { isManager } from '../../utils/permission'

// 全PCの所持金の増減履歴(手動・店の購入/売上・カジノ・ディーラー)。pcId を指定するとそのPCだけ
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }

  const query = getQuery(event)
  const pcId = query.pcId ? Number(query.pcId) : null
  // 種別での絞り込み(決まった条件だけを使う)
  const CATEGORY_WHERE = {
    manual: "l.kind = 'manual'",
    magic_shop: "l.kind IN ('purchase', 'sale') AND l.sub LIKE '魔法店%'",
    weapon_shop: "l.kind IN ('purchase', 'sale') AND l.sub LIKE '武器屋%'",
    casino: "l.kind IN ('casino', 'dealer', 'casino_month', 'dealer_month')",
    casino_month: "l.kind IN ('casino_month', 'dealer_month')",
    ledger: "l.kind IN ('settle', 'mode')",
  }
  const categoryWhere = CATEGORY_WHERE[query.category] ?? '1 = 1'

  const { results } = await db
    .prepare(
      `SELECT l.*, pcs.name AS pc_name, u.name AS user_name FROM (
         SELECT type AS kind, id, pc_id, amount, reason AS detail, NULL AS sub, created_by AS user_id, created_at
         FROM money_logs
         UNION ALL
         SELECT 'purchase', id, pc_id, -total, item_name || CASE WHEN set_size > 1 THEN '(' || set_size || '個セット)' ELSE '' END || CASE WHEN discount = 1 THEN '(割引)' ELSE '' END || CASE WHEN carry_in = 1 THEN '(持ち込み)' ELSE '' END, shop || ' ×' || quantity, purchased_by, created_at
         FROM purchases
         UNION ALL
         SELECT 'sale', po.id, po.pc_id, po.amount, pu.item_name || CASE WHEN pu.set_size > 1 THEN '(' || pu.set_size || '個セット)' ELSE '' END || CASE WHEN pu.discount = 1 THEN '(割引)' ELSE '' END || CASE WHEN pu.carry_in = 1 THEN '(持ち込み)' ELSE '' END, pu.shop || ' ×' || pu.quantity, pu.purchased_by, po.created_at
         FROM purchase_payouts po JOIN purchases pu ON pu.id = po.purchase_id
         UNION ALL
         -- D1 は UNION を5つまでしか重ねられないので、カジノ関係は1つにまとめる
         SELECT * FROM (
           SELECT 'casino', id, pc_id, net, hand, bet, played_by, created_at
           FROM chinchiro_games
           UNION ALL
           SELECT 'dealer', g.id, g.dealer_pc_id, g.dealer_delta, g.hand, p.name, g.played_by, g.created_at
           FROM chinchiro_games g LEFT JOIN pcs p ON p.id = g.pc_id
           WHERE g.dealer_pc_id IS NOT NULL
           UNION ALL
           SELECT 'casino_month', id, pc_id, net_total, month, plays || '/' || bet_total, NULL, created_at
           FROM chinchiro_monthly
           UNION ALL
           SELECT 'dealer_month', m.id, m.dealer_pc_id, m.dealer_delta_total, m.month || '/' || m.plays, p.name, NULL, m.created_at
           FROM chinchiro_monthly m LEFT JOIN pcs p ON p.id = m.pc_id
           WHERE m.dealer_pc_id != 0
         )
       ) l
       LEFT JOIN pcs ON pcs.id = l.pc_id
       LEFT JOIN users u ON u.id = l.user_id
       WHERE (?1 IS NULL OR l.pc_id = ?1) AND ${categoryWhere}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 200`
    )
    .bind(pcId)
    .all()

  return results
})
