import { cached } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db

  const { results } = await cached('faqs', () =>
    db.prepare('SELECT * FROM faq_items ORDER BY sort_order ASC').all()
  )

  return results
})