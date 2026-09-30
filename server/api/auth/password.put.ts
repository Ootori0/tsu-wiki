import { getSessionUser } from '../../utils/session'
import { hashPassword, verifyPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const body = await readBody(event)
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    throw createError({ statusCode: 400, statusMessage: '現在のパスワードと新しいパスワードが必要です' })
  }

  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, statusMessage: '新しいパスワードは8文字以上にしてください' })
  }

  const existing = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(currentUser.id)
    .first()

  const valid = await verifyPassword(currentPassword, existing.password_hash, existing.password_salt)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: '現在のパスワードが正しくありません' })
  }

  const { hash, salt } = await hashPassword(newPassword)

  await db
    .prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(hash, salt, currentUser.id)
    .run()

  return { success: true }
})