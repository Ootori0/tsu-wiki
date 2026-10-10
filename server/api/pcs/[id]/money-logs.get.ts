import { requirePcOwner } from '../../../utils/pcAccess'

// 所持金の増減履歴(手動・店の購入/売上・カジノ)をまとめて新しい順に返す
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  await requirePcOwner(event, db, id)

  const { results } = await db
    .prepare(
      `SELECT * FROM (
         SELECT 'manual' AS kind, id, amount, reason AS detail, NULL AS sub, created_at
         FROM money_logs WHERE pc_id = ?1
         UNION ALL
         SELECT 'purchase', id, -total, item_name, shop || ' ×' || quantity, created_at
         FROM purchases WHERE pc_id = ?1
         UNION ALL
         SELECT 'sale', po.id, po.amount, pu.item_name, pu.shop || ' ×' || pu.quantity, po.created_at
         FROM purchase_payouts po JOIN purchases pu ON pu.id = po.purchase_id
         WHERE po.pc_id = ?1
         UNION ALL
         SELECT 'casino', id, net, hand, bet, created_at
         FROM chinchiro_games WHERE pc_id = ?1
         UNION ALL
         SELECT 'dealer', g.id, g.dealer_delta, g.hand, pcs.name, g.created_at
         FROM chinchiro_games g LEFT JOIN pcs ON pcs.id = g.pc_id
         WHERE g.dealer_pc_id = ?1
       ) ORDER BY created_at DESC, id DESC LIMIT 100`
    )
    .bind(id)
    .all()

  return results
})
