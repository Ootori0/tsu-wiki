import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const id = getRouterParam(event, 'id')

  const target = await db.prepare('SELECT name FROM permissions WHERE id = ?').bind(id).first()
  if (target?.name === 'admin') {
    throw createError({ statusCode: 400, statusMessage: 'admin権限は削除できません' })
  }

  await db.prepare('DELETE FROM permissions WHERE id = ?').bind(id).run()

  return { success: true }
})