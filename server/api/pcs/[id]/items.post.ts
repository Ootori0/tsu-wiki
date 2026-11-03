import { requirePcOwner } from '../../../utils/pcAccess'
import { parsePcItemBody, formatPcItem } from '../../../utils/pcItems'

// 所持品の追加(PCの作成者/admin)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const { pc } = await requirePcOwner(event, db, id)
  const item = parsePcItemBody(await readBody(event))

  const result = await db
    .prepare(
      `INSERT INTO pc_items (pc_id, name, quantity, size, per_slot, category, effect, modifiers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(pc.id, item.name, item.quantity, item.size, item.perSlot, item.category, item.effect, item.modifiers)
    .run()

  // 画面で読み込み直さずに済むよう、追加した所持品を返す
  const row = await db.prepare('SELECT * FROM pc_items WHERE id = ?').bind(result.meta.last_row_id).first()
  return { success: true, item: formatPcItem(row) }
})
