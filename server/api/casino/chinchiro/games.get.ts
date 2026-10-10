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

  // 自分が遊んだゲームと、ディーラーとして関わったゲーム
  const { results } = await db
    .prepare(
      `SELECT g.*, pcs.name AS player_name,
              CASE WHEN g.pc_id = ? THEN 'player' ELSE 'dealer' END AS role
       FROM chinchiro_games g LEFT JOIN pcs ON pcs.id = g.pc_id
       WHERE g.pc_id = ? OR g.dealer_pc_id = ?
       ORDER BY g.id DESC LIMIT 20`
    )
    .bind(pcId, pcId, pcId)
    .all()

  return results.map((r) => ({ ...r, rolls: JSON.parse(r.rolls) }))
})
