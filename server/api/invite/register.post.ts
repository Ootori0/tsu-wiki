import { hashPassword } from '../../utils/password'
import { createSession } from '../../utils/session'
import { findUsableInvite, hashInviteToken } from '../../utils/invite'

// リンクからアカウントを作る(権限なし)。作ったらそのままログインする
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { token, name, password } = (await readBody(event)) ?? {}

  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed || trimmed.length > 32) {
    throw createError({ statusCode: 400, statusMessage: 'ID は1〜32文字で入力してください' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'パスワードは8文字以上にしてください' })
  }
  if (!(await findUsableInvite(db, token))) {
    throw createError({ statusCode: 410, statusMessage: 'このリンクは期限切れか、すでに使われています' })
  }
  const exists = await db.prepare('SELECT 1 FROM users WHERE name = ?').bind(trimmed).first()
  if (exists) {
    throw createError({ statusCode: 409, statusMessage: 'この ID はすでに使われています' })
  }

  const tokenHash = await hashInviteToken(token)
  const { hash, salt } = await hashPassword(password)
  // リンクが使える間だけアカウントを作り、同じトランザクションでリンクを使用済みにする
  // (同時に使われても、先に通った1件だけが作られる)
  let results
  try {
    results = await db.batch([
      db
        .prepare(
          `INSERT INTO users (name, password_hash, password_salt, permissions)
           SELECT ?, ?, ?, '[]'
           WHERE EXISTS (SELECT 1 FROM invites WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now'))`
        )
        .bind(trimmed, hash, salt, tokenHash),
      db
        .prepare(
          `UPDATE invites SET used_at = datetime('now'), used_by = (SELECT id FROM users WHERE name = ?)
           WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
             AND EXISTS (SELECT 1 FROM users WHERE name = ?)`
        )
        .bind(trimmed, tokenHash, trimmed),
    ])
  } catch (e) {
    if (String(e?.message ?? e).includes('UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'この ID はすでに使われています' })
    }
    throw e
  }
  if (!results[0].meta.changes) {
    throw createError({ statusCode: 410, statusMessage: 'このリンクは期限切れか、すでに使われています' })
  }

  const userId = results[0].meta.last_row_id
  const { sessionId, expiresAt } = await createSession(db, userId)
  setCookie(event, 'session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
  return { id: userId, name: trimmed }
})
