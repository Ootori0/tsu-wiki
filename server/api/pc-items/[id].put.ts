import { requirePcOwner } from '../../utils/pcAccess'
import { parsePcItemBody } from '../../utils/pcItems'

// 所持品の編集(PCの作成者/admin)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const existing = await db.prepare('SELECT pc_id FROM pc_items WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '所持品が見つかりません' })
  }
  await requirePcOwner(event, db, existing.pc_id)
  const item = parsePcItemBody(await readBody(event))

  await db
    .prepare(
      `UPDATE pc_items SET name = ?, quantity = ?, size = ?, per_slot = ?, consumable = ?, effect = ?, modifiers = ?
       WHERE id = ?`
    )
    .bind(item.name, item.quantity, item.size, item.perSlot, item.consumable, item.effect, item.modifiers, id)
    .run()

  return { success: true, id }
})
