export function generateSessionId() {
  return crypto.randomUUID()
}

export async function createSession(db: any, userId: number) {
  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) // 14日間

  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, userId, expiresAt.toISOString())
    .run()

  return { sessionId, expiresAt }
}

export async function getSessionUser(db: any, sessionId: string) {
  if (!sessionId) return null

  const session = await db
    .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
    .bind(sessionId)
    .first()

  if (!session) return null

  const user = await db
    .prepare('SELECT id, name, permissions FROM users WHERE id = ?')
    .bind(session.user_id)
    .first()

  if (!user) return null

  return { ...user, permissions: JSON.parse(user.permissions) }
}

export async function deleteSession(db: any, sessionId: string) {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
}