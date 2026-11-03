import { requirePcOwner } from '../../utils/pcAccess'
import { parsePcItemBody, formatPcItem } from '../../utils/pcItems'

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
      `UPDATE pc_items SET name = ?, quantity = ?, size = ?, per_slot = ?, category = ?, effect = ?, modifiers = ?
       WHERE id = ?`
    )
    .bind(item.name, item.quantity, item.size, item.perSlot, item.category, item.effect, item.modifiers, id)
    .run()

  // 画面で読み込み直さずに済むよう、保存した所持品を返す
  const row = await db.prepare('SELECT * FROM pc_items WHERE id = ?').bind(id).first()
  return { success: true, item: formatPcItem(row) }
})
