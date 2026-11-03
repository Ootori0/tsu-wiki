import { requirePcOwner } from '../../../../utils/pcAccess'
import { ITEM_CATEGORIES } from '../../../../utils/pcItems'

// 所持品の区分をまとめて変える(倉庫⇔荷物の出し入れを確定するとき)。1回の通信・1つのトランザクションで行う
// body: { moves: [{ id, category }] }
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const pcId = Number(getRouterParam(event, 'id'))
  const { pc } = await requirePcOwner(event, db, pcId)

  const { moves } = (await readBody(event)) ?? {}
  if (!Array.isArray(moves) || moves.length === 0 || moves.length > 200) {
    throw createError({ statusCode: 400, statusMessage: '移動する所持品を指定してください' })
  }
  for (const m of moves) {
    if (!Number.isInteger(Number(m?.id)) || !ITEM_CATEGORIES.includes(m?.category)) {
      throw createError({ statusCode: 400, statusMessage: '移動の指定が不正です' })
    }
  }

  // このPCの所持品だけを動かす(pc_id も条件に入れる)
  await db.batch(
    moves.map((m) =>
      db.prepare('UPDATE pc_items SET category = ? WHERE id = ? AND pc_id = ?').bind(m.category, Number(m.id), pc.id)
    )
  )
  return { success: true }
})
