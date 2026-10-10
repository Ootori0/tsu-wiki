import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { parseShopItemBody, assertSellersExist, sellerInsertStatements } from '../../utils/shop'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const item = parseShopItemBody(await readBody(event))
  await assertSellersExist(db, item.sellers)

  // 商品と販売者を同じトランザクションで登録(販売者の item_id は直前に追加した商品)
  await db.batch([
    db
      .prepare('INSERT INTO shop_items (shop, name, price, stock, description) VALUES (?, ?, ?, ?, ?)')
      .bind(item.shop, item.name, item.price, item.stock, item.description),
    ...sellerInsertStatements(db, '(SELECT MAX(id) FROM shop_items)', [], item.sellers),
  ])

  return { success: true }
})
