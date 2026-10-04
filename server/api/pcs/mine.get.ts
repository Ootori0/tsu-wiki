import { getSessionUser } from '../../utils/session'
import { formatPc } from '../../utils/pc'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { results } = await db
    .prepare('SELECT * FROM pcs WHERE created_by = ? ORDER BY affiliation ASC, grade ASC, name ASC')
    .bind(currentUser.id)
    .all()

  return results.map(formatPc)
})
