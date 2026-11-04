import { requirePcOwner } from '../../utils/pcAccess'

// 所持品の削除(PCの作成者/admin)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const existing = await db.prepare('SELECT pc_id, shop_item_id, magic_id FROM pc_items WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: '所持品が見つかりません' })
  }
  await requirePcOwner(event, db, existing.pc_id)
  // 魔道具・AFは魔道具・AFの欄で管理する(店の商品は消費・削除できる)
  if (existing.magic_id) {
    throw createError({ statusCode: 400, statusMessage: '魔道具・AFは所持品からは削除できません(魔道具・AFの欄で削除してください)' })
  }

  await db.prepare('DELETE FROM pc_items WHERE id = ?').bind(id).run()
  return { success: true }
})
