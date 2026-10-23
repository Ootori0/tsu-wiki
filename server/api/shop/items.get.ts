import { getSessionUser } from '../../utils/session'
import { isManager } from '../../utils/permission'
import { cached } from '../../utils/cache'

// 販売者の金額は admin/KP のみに返す
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')
  const admin = isManager(currentUser?.permissions)

  // 商品と販売者(通常・割引)をまとめてキャッシュする(商品の変更・購入・PCの変更で破棄)
  const [{ results: items }, { results: sellers }, { results: discountSellers }] = await cached('shop:items', () => db.batch([
    db.prepare('SELECT * FROM shop_items ORDER BY shop ASC, id DESC'),
    db.prepare(
      `SELECT s.item_id, s.pc_id, s.amount, pcs.name AS pc_name
       FROM shop_item_sellers s JOIN pcs ON pcs.id = s.pc_id
       ORDER BY s.id ASC`
    ),
    db.prepare(
      `SELECT s.item_id, s.pc_id, s.amount, pcs.name AS pc_name
       FROM shop_item_discount_sellers s JOIN pcs ON pcs.id = s.pc_id
       ORDER BY s.id ASC`
    ),
  ]))

  const sellersOf = (list, itemId) => list
    .filter((s) => s.item_id === itemId)
    .map((s) => (admin
      ? { pcId: s.pc_id, pcName: s.pc_name, amount: s.amount }
      : { pcId: s.pc_id, pcName: s.pc_name }))

  return items.map((item) => ({
    ...item,
    sellers: sellersOf(sellers, item.id),
    discountSellers: sellersOf(discountSellers, item.id),
  }))
})
