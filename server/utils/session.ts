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

  // セッションとユーザーを1回の読み出しで取得する
  const user = await db
    .prepare(
      `SELECT users.id, users.name, users.permissions
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > datetime("now")`
    )
    .bind(sessionId)
    .first()

  if (!user) return null

  return { ...user, permissions: JSON.parse(user.permissions) }
}

export async function deleteSession(db: any, sessionId: string) {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
}