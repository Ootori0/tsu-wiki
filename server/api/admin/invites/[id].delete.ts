import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'

// 未使用のリンクを無効にする(使用済みのものは記録として残す)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const id = Number(getRouterParam(event, 'id'))
  await db.prepare('DELETE FROM invites WHERE id = ? AND used_at IS NULL').bind(id).run()
  return { success: true }
})
