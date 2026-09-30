import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { hashPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const body = await readBody(event)
  const { name, password, permissions } = body

  if (!name || !password) {
    throw createError({ statusCode: 400, statusMessage: 'name and password are required' })
  }

  const { hash, salt } = await hashPassword(password)

  const result = await db
    .prepare(
      'INSERT INTO users (name, password_hash, password_salt, permissions) VALUES (?, ?, ?, ?)'
    )
    .bind(name, hash, salt, JSON.stringify(permissions ?? []))
    .run()

  return { id: result.meta.last_row_id, success: true }
})