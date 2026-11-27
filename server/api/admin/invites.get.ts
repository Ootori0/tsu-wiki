import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

// 発行したリンクの一覧(新しい順に50件)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const { results } = await db
    .prepare(
      `SELECT i.id, i.expires_at, i.used_at, i.created_at, u.name AS used_by_name, c.name AS created_by_name,
              (i.used_at IS NULL AND i.expires_at > datetime('now')) AS usable
       FROM invites i
       LEFT JOIN users u ON u.id = i.used_by
       LEFT JOIN users c ON c.id = i.created_by
       ORDER BY i.created_at DESC, i.id DESC LIMIT 50`
    )
    .all()
  return results.map((r) => ({ ...r, usable: !!r.usable }))
})
