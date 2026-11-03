import { requirePcOwner } from '../../../utils/pcAccess'
import { parsePcItemBody } from '../../../utils/pcItems'

// 所持品の追加(PCの作成者/admin)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const { pc } = await requirePcOwner(event, db, id)
  const item = parsePcItemBody(await readBody(event))

  const result = await db
    .prepare(
      `INSERT INTO pc_items (pc_id, name, quantity, size, per_slot, consumable, effect, modifiers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(pc.id, item.name, item.quantity, item.size, item.perSlot, item.consumable, item.effect, item.modifiers)
    .run()

  return { success: true, id: result.meta.last_row_id }
})
