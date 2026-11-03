import { requirePcOwner } from '../../utils/pcAccess'
import { parsePcItemBody, formatPcItem } from '../../utils/pcItems'

// 所持品の編集(PCの作成者/admin)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const existing = await db.prepare('SELECT pc_id, shop_item_id FROM pc_items WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '所持品が見つかりません' })
  }
  await requirePcOwner(event, db, existing.pc_id)
  // 店で買った品物はマイページでは荷物と倉庫の出し入れだけ(個数などは購入・取り消しで変わる)
  if (existing.shop_item_id) {
    throw createError({ statusCode: 400, statusMessage: '店で買った品物は編集できません(荷物と倉庫の出し入れだけできます)' })
  }
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
