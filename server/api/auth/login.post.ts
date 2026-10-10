import { verifyPassword } from '../../utils/password'
import { createSession } from '../../utils/session'

// 総当たり対策: 一定時間内の失敗回数が上限を超えたらしばらくログインさせない
const LOCK_MINUTES = 15
const MAX_FAILURES_PER_NAME = 5
const MAX_FAILURES_PER_IP = 20

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const body = await readBody(event)
  const { name, password } = body ?? {}

  if (!name || !password) {
    throw createError({ statusCode: 400, statusMessage: 'name and password are required' })
  }

  const ip = getRequestHeader(event, 'cf-connecting-ip') ?? getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const since = `-${LOCK_MINUTES} minutes`

  const [, nameRow, ipRow] = await db.batch([
    // 1日より古い記録は消す
    db.prepare("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')"),
    db
      .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE name = ? AND created_at > datetime('now', ?)")
      .bind(name, since),
    db
      .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE ip = ? AND created_at > datetime('now', ?)")
      .bind(ip, since),
  ])
  if ((nameRow.results[0]?.c ?? 0) >= MAX_FAILURES_PER_NAME || (ipRow.results[0]?.c ?? 0) >= MAX_FAILURES_PER_IP) {
    throw createError({
      statusCode: 429,
      statusMessage: `ログインの失敗が続いたため、${LOCK_MINUTES}分ほど待ってから再度お試しください`,
    })
  }

  const user = await db
    .prepare('SELECT * FROM users WHERE name = ?')
    .bind(name)
    .first()

  const valid = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false
  if (!valid) {
    await db.prepare('INSERT INTO login_attempts (name, ip) VALUES (?, ?)').bind(name, ip).run()
    throw createError({ statusCode: 401, statusMessage: 'ID またはパスワードが違います' })
  }

  // 成功したらそのIDの失敗記録を消す
  await db.prepare('DELETE FROM login_attempts WHERE name = ?').bind(name).run()

  const { sessionId, expiresAt } = await createSession(db, user.id)

  setCookie(event, 'session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return { id: user.id, name: user.name, permissions: JSON.parse(user.permissions) }
})
