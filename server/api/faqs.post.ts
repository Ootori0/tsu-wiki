import { invalidateCache } from '../utils/cache'
import { requireLogin } from '../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  await requireLogin(event, db)
  const body = await readBody(event)

  const { question, answer, sortOrder } = body

  if (!question || !answer) {
    throw createError({
      statusCode: 400,
      statusMessage: 'question and answer are required',
    })
  }

  const result = await db
    .prepare(
      'INSERT INTO faq_items (question, answer, sort_order) VALUES (?, ?, ?)'
    )
    .bind(question, answer, sortOrder ?? 0)
    .run()

  invalidateCache('faqs')

  return { id: result.meta.last_row_id, question, answer, sortOrder }
})