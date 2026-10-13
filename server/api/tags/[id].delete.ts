import { getSessionUser } from '../../utils/session'
import { isManager } from '../../utils/permission'
import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }

  const id = getRouterParam(event, 'id')
  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()

  invalidateCache('tags')

  return { success: true }
})