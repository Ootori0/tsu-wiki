import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const body = await readBody(event)
  const { name } = body

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const exists = await db.prepare('SELECT id FROM permissions WHERE name = ?').bind(name).first()
  if (exists) {
    throw createError({ statusCode: 409, statusMessage: '同じ名前の権限が既にあります' })
  }

  const result = await db.prepare('INSERT INTO permissions (name) VALUES (?)').bind(name).run()

  invalidateCache('permissions')

  return { id: result.meta.last_row_id, name }
})