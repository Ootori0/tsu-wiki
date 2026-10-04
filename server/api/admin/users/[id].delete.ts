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

  if (Number(id) === currentUser.id) {
    throw createError({ statusCode: 400, statusMessage: '自分自身は削除できません' })
  }

  const target = await db.prepare('SELECT permissions FROM users WHERE id = ?').bind(id).first()
  if (target && JSON.parse(target.permissions).includes('admin')) {
    throw createError({ statusCode: 400, statusMessage: 'admin権限を持つアカウントは削除できません' })
  }

  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

  return { success: true }
})