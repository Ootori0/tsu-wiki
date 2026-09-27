
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const body = await readBody(event)

  const { title, content, sortOrder } = body

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  const result = await db
    .prepare(
      'INSERT INTO setting_items (title, body, sort_order) VALUES (?, ?, ?)'
    )
    .bind(title, content ?? '', sortOrder ?? 0)
    .run()

  return { id: result.meta.last_row_id, title, body: content, sortOrder }
})