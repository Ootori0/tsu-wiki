import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { title, content } = body

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  await db
    .prepare(
      `UPDATE setting_items
       SET title = ?, body = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(title, content ?? '', id)
    .run()

  invalidateCache('settings')

  return { id: Number(id), title, body: content }
})