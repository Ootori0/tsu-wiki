export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { results } = await db.prepare('SELECT * FROM tags ORDER BY name ASC').all()
  return results
})