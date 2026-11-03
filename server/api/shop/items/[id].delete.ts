import { getSessionUser } from '../../../utils/session'
import { isManager } from '../../../utils/permission'
import { invalidateCache } from '../../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }

  const id = getRouterParam(event, 'id')
  await db.batch([
    db.prepare('DELETE FROM shop_item_sellers WHERE item_id = ?').bind(id),
    db.prepare('DELETE FROM shop_item_discount_sellers WHERE item_id = ?').bind(id),
    db.prepare('DELETE FROM shop_items WHERE id = ?').bind(id),
    // 持っている人の所持品は消さず、商品との結びつきを外して自分で編集できる品物として残す
    db.prepare('UPDATE pc_items SET shop_item_id = NULL WHERE shop_item_id = ?').bind(id),
  ])

  invalidateCache('shop:items')

  return { success: true }
})
