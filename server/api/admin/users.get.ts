import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const { results } = await db
    .prepare('SELECT id, name, permissions, created_at FROM users ORDER BY id ASC')
    .all()

  return results.map((r) => ({ ...r, permissions: JSON.parse(r.permissions) }))
})