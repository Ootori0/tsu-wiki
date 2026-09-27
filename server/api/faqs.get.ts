export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db

  const { results } = await db
    .prepare('SELECT * FROM faq_items ORDER BY sort_order ASC')
    .all()

  return results
})