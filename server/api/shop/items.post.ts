import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { parseShopItemBody } from '../../utils/shop'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const item = parseShopItemBody(await readBody(event))

  const result = await db
    .prepare('INSERT INTO shop_items (shop, name, price, stock, description) VALUES (?, ?, ?, ?, ?)')
    .bind(item.shop, item.name, item.price, item.stock, item.description)
    .run()

  return { id: result.meta.last_row_id, success: true }
})
