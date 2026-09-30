import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

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

  const result = await db.prepare('INSERT INTO permissions (name) VALUES (?)').bind(name).run()

  return { id: result.meta.last_row_id, name }
})