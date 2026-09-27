export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const category = getQuery(event).category as string | undefined

  let query = 'SELECT * FROM spells'
  const params: string[] = []

  if (category) {
    query += ' WHERE category = ?'
    params.push(category)
  }

  query += ' ORDER BY sort_order ASC'

  const { results } = await db.prepare(query).bind(...params).all()

  return results
})