import { getSessionUser } from './session'
import { isAdmin } from './permission'

// ログイン中のユーザーと、遊ぶPC(自分のPC。admin はどのPCでも)
export async function requirePlayablePc(event, db, pcId) {
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }
  const pc = await db.prepare('SELECT id, name, created_by, money, money_mode FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '自分のPCでのみ遊べます' })
  }
  return { currentUser, pc }
}
