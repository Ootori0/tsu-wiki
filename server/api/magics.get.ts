import { getSessionUser } from '../utils/session'
import { canView } from '../utils/permission'
import { cached } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  const query = getQuery(event)
  const type = query.type

  // 全件をキャッシュし、区分・閲覧権限での絞り込みはリクエストごとに行う
  const all = await cached('magics', async () => {
    const { results } = await db.prepare('SELECT * FROM magics ORDER BY sort_order ASC').all()
    return results.map((r) => ({
      ...r,
      tags: JSON.parse(r.tags),
      visible_permissions: JSON.parse(r.visible_permissions),
    }))
  })

  const userPermissions = currentUser?.permissions ?? null

  const visibleResults = all
    .filter((r) => !type || type === 'すべて' || r.type === type)
    .filter((r) => canView(userPermissions, r.visible_permissions))

  return visibleResults
})