import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { COMPRESS_KEEP_DAYS, compressCutoff } from '../../../utils/chinchiroCompress'

// 圧縮できる勝負の件数(admin のみ)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const [{ results: [games] }, { results: [monthly] }] = await db.batch([
    db.prepare('SELECT COUNT(*) AS count FROM chinchiro_games WHERE created_at < ?').bind(compressCutoff()),
    db.prepare('SELECT COUNT(*) AS count FROM chinchiro_monthly'),
  ])

  return { compressible: games.count, monthly: monthly.count, keepDays: COMPRESS_KEEP_DAYS }
})
