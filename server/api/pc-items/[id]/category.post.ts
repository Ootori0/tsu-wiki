import { requirePcOwner } from '../../../utils/pcAccess'
import { ITEM_CATEGORIES } from '../../../utils/pcItems'

// 所持品の区分だけを変える(倉庫⇔荷物の出し入れなど)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const existing = await db.prepare('SELECT pc_id FROM pc_items WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '所持品が見つかりません' })
  }
  await requirePcOwner(event, db, existing.pc_id)

  const { category } = (await readBody(event)) ?? {}
  if (!ITEM_CATEGORIES.includes(category)) {
    throw createError({ statusCode: 400, statusMessage: '区分が不正です' })
  }
  await db.prepare('UPDATE pc_items SET category = ? WHERE id = ?').bind(category, id).run()
  return { success: true }
})
