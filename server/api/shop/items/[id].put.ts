import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { parseShopItemBody } from '../../../utils/shop'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const id = getRouterParam(event, 'id')
  const item = parseShopItemBody(await readBody(event))

  await db
    .prepare(
      `UPDATE shop_items
       SET shop = ?, name = ?, price = ?, stock = ?, description = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(item.shop, item.name, item.price, item.stock, item.description, id)
    .run()

  return { id: Number(id), success: true }
})
