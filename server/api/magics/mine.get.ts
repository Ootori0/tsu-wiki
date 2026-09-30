import { getSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { results } = await db
    .prepare('SELECT * FROM magics WHERE created_by = ? ORDER BY sort_order ASC')
    .bind(currentUser.id)
    .all()

  return results.map((r) => ({
    ...r,
    tags: JSON.parse(r.tags),
    visible_permissions: JSON.parse(r.visible_permissions),
  }))
})