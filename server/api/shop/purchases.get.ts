import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

// pcId指定: そのPCの購入履歴(作成者/admin) / 指定なし: 全履歴(adminのみ)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { pcId } = getQuery(event)
  const admin = isAdmin(currentUser.permissions)

  if (!pcId) {
    if (!admin) {
      throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
    }
    const { results } = await db
      .prepare(
        `SELECT purchases.*, pcs.name AS pc_name FROM purchases
         LEFT JOIN pcs ON pcs.id = purchases.pc_id
         ORDER BY purchases.id DESC LIMIT 100`
      )
      .all()
    return results
  }

  const pc = await db.prepare('SELECT created_by FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !admin) {
    throw createError({ statusCode: 403, statusMessage: '閲覧権限がありません' })
  }

  const { results } = await db
    .prepare('SELECT * FROM purchases WHERE pc_id = ? ORDER BY id DESC LIMIT 50')
    .bind(pcId)
    .all()
  return results
})
