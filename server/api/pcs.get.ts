import { formatPc } from '../utils/pc'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db

  const { results } = await db
    .prepare('SELECT * FROM pcs ORDER BY affiliation ASC, grade ASC, name ASC')
    .all()

  return results.map(formatPc)
})
