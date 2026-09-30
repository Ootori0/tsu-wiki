import { verifyPassword } from '../../utils/password'
import { createSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const body = await readBody(event)
  const { name, password } = body

  if (!name || !password) {
    throw createError({ statusCode: 400, statusMessage: 'name and password are required' })
  }

  const user = await db
    .prepare('SELECT * FROM users WHERE name = ?')
    .bind(name)
    .first()

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'ID またはパスワードが違います' })
  }

  const valid = await verifyPassword(password, user.password_hash, user.password_salt)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'ID またはパスワードが違います' })
  }

  const { sessionId, expiresAt } = await createSession(db, user.id)

  setCookie(event, 'session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // ← 修正
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return { id: user.id, name: user.name, permissions: JSON.parse(user.permissions) }
})