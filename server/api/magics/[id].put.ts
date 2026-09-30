import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const id = getRouterParam(event, 'id')

  const existing = await db.prepare('SELECT * FROM magics WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  const isOwner = existing.created_by === currentUser.id
  if (!isOwner && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '編集権限がありません' })
  }

  const body = await readBody(event)
  const {
    type, name, owner, tags, cost, condition, effect, visiblePermissions,
  } = body

  if (!type || !name) {
    throw createError({ statusCode: 400, statusMessage: 'type and name are required' })
  }

  await db
    .prepare(
      `UPDATE magics
       SET type = ?, visible_permissions = ?, name = ?, owner = ?, tags = ?, cost = ?, condition = ?, effect = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      type,
      JSON.stringify(visiblePermissions ?? []),
      name,
      owner ?? '',
      JSON.stringify(tags ?? []),
      cost ?? '',
      condition ?? '',
      effect ?? '',
      id
    )
    .run()

  return { id: Number(id), success: true }
})