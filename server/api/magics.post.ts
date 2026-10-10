import { getSessionUser } from '../utils/session'
import { invalidateCache } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const body = await readBody(event)
  const {
    type, name, owner, tags, cost, condition, effect,
    visiblePermissions, sortOrder,
  } = body

  if (!type || !name) {
    throw createError({ statusCode: 400, statusMessage: 'type and name are required' })
  }

  const result = await db
    .prepare(
      `INSERT INTO magics
       (type, visible_permissions, created_by, name, owner, tags, cost, condition, effect, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      type,
      JSON.stringify(visiblePermissions ?? []),
      currentUser.id,
      name,
      owner ?? '',
      JSON.stringify(tags ?? []),
      cost ?? '',
      condition ?? '',
      effect ?? '',
      sortOrder ?? 0
    )
    .run()

  invalidateCache('magics')

  return { id: result.meta.last_row_id, success: true }
})