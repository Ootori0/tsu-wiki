export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { title, content, sortOrder } = body

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  await db
    .prepare(
      `UPDATE setting_items
       SET title = ?, body = ?, sort_order = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(title, content ?? '', sortOrder ?? 0, id)
    .run()

  return { id: Number(id), title, body: content, sortOrder }
})