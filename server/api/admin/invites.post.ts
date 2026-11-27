import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { INVITE_HOURS, generateInviteToken, hashInviteToken } from '../../utils/invite'

// リンクを発行する。トークンはこの応答でしか返さない(DB には SHA-256 だけ残す)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const { hours } = (await readBody(event)) ?? {}
  const h = Number(hours)
  if (!INVITE_HOURS.includes(h)) {
    throw createError({ statusCode: 400, statusMessage: '期限が正しくありません' })
  }

  const token = generateInviteToken()
  const row = await db
    .prepare(
      `INSERT INTO invites (token_hash, created_by, expires_at) VALUES (?, ?, datetime('now', ?))
       RETURNING id, expires_at`
    )
    .bind(await hashInviteToken(token), currentUser.id, `+${h} hours`)
    .first()

  return { id: row.id, token, expiresAt: row.expires_at }
})
