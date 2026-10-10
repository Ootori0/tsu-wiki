import { getSessionUser } from '../utils/session'
import { cached } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { results } = await cached('permissions', () => db.prepare('SELECT * FROM permissions ORDER BY name ASC').all())
  return results
})