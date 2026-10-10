import { invalidateCache } from '../../utils/cache'
import { requireLogin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  await requireLogin(event, db)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { question, answer } = body

  if (!question || !answer) {
    throw createError({
      statusCode: 400,
      statusMessage: 'question and answer are required',
    })
  }

  await db
    .prepare(
      `UPDATE faq_items
       SET question = ?, answer = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(question, answer, id)
    .run()

  invalidateCache('faqs')

  return { id: Number(id), question, answer }
})