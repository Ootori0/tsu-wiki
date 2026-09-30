import { getSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const body = await readBody(event)
  const { name } = body

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const existing = await db
    .prepare('SELECT id FROM users WHERE name = ? AND id != ?')
    .bind(name, currentUser.id)
    .first()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'そのIDは既に使用されています' })
  }

  await db
    .prepare('UPDATE users SET name = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(name, currentUser.id)
    .run()

  return { success: true, name }
})