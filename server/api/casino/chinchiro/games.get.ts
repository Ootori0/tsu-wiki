import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { pcId } = getQuery(event)
  const pc = await db.prepare('SELECT created_by FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '閲覧権限がありません' })
  }

  const { results } = await db
    .prepare('SELECT * FROM chinchiro_games WHERE pc_id = ? ORDER BY id DESC LIMIT 20')
    .bind(pcId)
    .all()

  return results.map((r) => ({ ...r, rolls: JSON.parse(r.rolls) }))
})
