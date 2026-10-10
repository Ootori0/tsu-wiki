import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = getRouterParam(event, 'id')

  await db
    .prepare('DELETE FROM faq_items WHERE id = ?')
    .bind(id)
    .run()

  invalidateCache('faqs')

  return { success: true, id: Number(id) }
})