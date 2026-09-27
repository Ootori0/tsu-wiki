export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = getRouterParam(event, 'id')

  await db
    .prepare('DELETE FROM setting_items WHERE id = ?')
    .bind(id)
    .run()

  return { success: true, id: Number(id) }
})