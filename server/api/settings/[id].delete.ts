import { invalidateCache } from '../../utils/cache'
import { requireLogin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  await requireLogin(event, db)
  const id = getRouterParam(event, 'id')

  await db
    .prepare('DELETE FROM setting_items WHERE id = ?')
    .bind(id)
    .run()

  invalidateCache('settings')

  return { success: true, id: Number(id) }
})