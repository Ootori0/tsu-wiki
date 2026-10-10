import { getSessionUser } from './session'
import { isAdmin } from './permission'

// PCの作成者またはadminのみ許可し、ユーザーとPCを返す
export async function requirePcOwner(event, db, id) {
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const pc = await db.prepare('SELECT id, created_by, money FROM pcs WHERE id = ?').bind(id).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '権限がありません' })
  }

  return { currentUser, pc }
}
