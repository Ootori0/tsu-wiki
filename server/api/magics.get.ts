import { getSessionUser } from '../utils/session'
import { canView } from '../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  const query = getQuery(event)
  const type = query.type

  let sql = 'SELECT * FROM magics'
  const params = []

  if (type && type !== 'すべて') {
    sql += ' WHERE type = ?'
    params.push(type)
  }

  sql += ' ORDER BY sort_order ASC'

  const { results } = await db.prepare(sql).bind(...params).all()

  const userPermissions = currentUser?.permissions ?? null

  const visibleResults = results
    .map((r) => ({
      ...r,
      tags: JSON.parse(r.tags),
      visible_permissions: JSON.parse(r.visible_permissions),
    }))
    .filter((r) => canView(userPermissions, r.visible_permissions))

  return visibleResults
})