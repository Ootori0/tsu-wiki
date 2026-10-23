import { getSessionUser } from '../../../utils/session'
import { isManager } from '../../../utils/permission'
import { parseShopItemBody, assertSellersExist, sellerInsertStatements } from '../../../utils/shop'
import { invalidateCache } from '../../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }

  const id = Number(getRouterParam(event, 'id'))
  const item = parseShopItemBody(await readBody(event))
  await assertSellersExist(db, [...item.sellers, ...item.discount.sellers])

  // 販売者は全件入れ替え
  await db.batch([
    db
      .prepare(
        `UPDATE shop_items
         SET shop = ?, name = ?, price = ?, stock = ?, description = ?,
             discount_price = ?, discount_stock = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(item.shop, item.name, item.price, item.stock, item.description, item.discount.price, item.discount.stock, id),
    db.prepare('DELETE FROM shop_item_sellers WHERE item_id = ?').bind(id),
    db.prepare('DELETE FROM shop_item_discount_sellers WHERE item_id = ?').bind(id),
    ...sellerInsertStatements(db, '?', [id], item.sellers),
    ...sellerInsertStatements(db, '?', [id], item.discount.sellers, 'shop_item_discount_sellers'),
  ])

  invalidateCache('shop:items')

  return { id, success: true }
})
