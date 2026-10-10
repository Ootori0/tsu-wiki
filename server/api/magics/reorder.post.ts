import { getSessionUser } from '../../utils/session'
import { canBypass } from '../../utils/permission'
import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  if (!canBypass(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '並び順の変更権限がありません' })
  }

  const body = await readBody(event)
  const order = body?.order

  if (!Array.isArray(order) || order.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'order array is required' })
  }

  const statements = order.map((entry) =>
    db.prepare('UPDATE magics SET sort_order = ? WHERE id = ?').bind(entry.sortOrder, entry.id)
  )

  await db.batch(statements)

  invalidateCache('magics')

  return { success: true }
})