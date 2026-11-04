import { requirePcOwner } from '../../../utils/pcAccess'
import { formatPcItem } from '../../../utils/pcItems'

// 所持品の消費(PCの作成者/admin): 個数を減らし、0個になったら所持品から外す
// 店の商品はマイページで個数を書き換えられないので、減らすときはこれを使う
// body: { quantity }
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const existing = await db.prepare('SELECT * FROM pc_items WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '所持品が見つかりません' })
  }
  await requirePcOwner(event, db, existing.pc_id)
  if (existing.magic_id) {
    throw createError({ statusCode: 400, statusMessage: '魔道具・AFは消費できません(魔道具・AFの欄で管理してください)' })
  }

  const { quantity } = (await readBody(event)) ?? {}
  const qty = Number(quantity ?? 1)
  if (!Number.isInteger(qty) || qty < 1 || qty > existing.quantity) {
    throw createError({ statusCode: 400, statusMessage: `1〜${existing.quantity}個の範囲で指定してください` })
  }

  if (qty === existing.quantity) {
    await db.prepare('DELETE FROM pc_items WHERE id = ?').bind(id).run()
    return { success: true, item: null }
  }
  await db.prepare('UPDATE pc_items SET quantity = quantity - ? WHERE id = ?').bind(qty, id).run()
  return { success: true, item: formatPcItem({ ...existing, quantity: existing.quantity - qty }) }
})
