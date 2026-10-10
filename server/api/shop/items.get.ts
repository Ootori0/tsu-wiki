export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { results } = await db
    .prepare('SELECT * FROM shop_items ORDER BY shop ASC, sort_order ASC, id ASC')
    .all()
  return results
})
