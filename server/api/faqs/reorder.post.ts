import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const body = await readBody(event)
  const order = body?.order

  if (!Array.isArray(order) || order.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'order array is required' })
  }

  const statements = order.map((entry) =>
    db
      .prepare('UPDATE faq_items SET sort_order = ? WHERE id = ?')
      .bind(entry.sortOrder, entry.id)
  )

  await db.batch(statements)

  invalidateCache('faqs')

  return { success: true, count: order.length }
})