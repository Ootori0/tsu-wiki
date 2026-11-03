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
  // 店で買った品物はマイページでは荷物と倉庫の出し入れだけ(個数などは購入・取り消しで変わる)
  if (existing.magic_id) {
    throw createError({ statusCode: 400, statusMessage: '魔道具・AFは所持品からは削除できません(魔道具・AFの欄で削除してください)' })
  }
  if (existing.shop_item_id) {
    throw createError({ statusCode: 400, statusMessage: '店で買った品物は削除できません(荷物と倉庫の出し入れだけできます)' })
  }

  await db.prepare('DELETE FROM pc_items WHERE id = ?').bind(id).run()
  return { success: true }
})
