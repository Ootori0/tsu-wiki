import { hashPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db

  // 既にユーザーが1人でも存在する場合は実行不可(誤爆・多重実行防止)
  const existing = await db.prepare('SELECT COUNT(*) as count FROM users').first()
  if (existing.count > 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'すでにユーザーが存在するため初期化できません',
    })
  }

  const body = await readBody(event)
  const { name, password } = body

  if (!name || !password) {
    throw createError({ statusCode: 400, statusMessage: 'name and password are required' })
  }

  const { hash, salt } = await hashPassword(password)
  const permissions = JSON.stringify(['admin', 'KP', 'SKP'])

  const result = await db
    .prepare(
      'INSERT INTO users (name, password_hash, password_salt, permissions) VALUES (?, ?, ?, ?)'
    )
    .bind(name, hash, salt, permissions)
    .run()

  return {
    success: true,
    id: result.meta.last_row_id,
    name,
    permissions: JSON.parse(permissions),
  }
})