import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const id = getRouterParam(event, 'id')

  const existing = await db.prepare('SELECT * FROM pcs WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  const isOwner = existing.created_by === currentUser.id
  if (!isOwner && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '削除権限がありません' })
  }

  await db.batch([
    // このPCを所持者にしていた魔法は、所持者をPC名の自由記述に戻す
    db.prepare('UPDATE magics SET owner = ?, owner_pc_id = NULL WHERE owner_pc_id = ?').bind(existing.name, id),
    db.prepare('DELETE FROM pcs WHERE id = ?').bind(id),
  ])

  invalidateCache('pcs', 'casino:dealer', 'shop:items', 'magics')

  return { success: true, id: Number(id) }
})
