import { requirePcOwner } from '../../../../utils/pcAccess'
import { ITEM_CATEGORIES, formatPcItem } from '../../../../utils/pcItems'

// 所持品を区分の間で移す(倉庫⇔荷物の出し入れを確定するとき)。個数の一部だけ移すこともできる
// body: { moves: [{ id, category, quantity }] }(quantity を省くと全部)
// ・移す先に同じ品物(名前・大きさ・効果・補正・元の商品などが同じ)があれば個数を足し、なければ分けて新しく作る
// ・全部移したら元の行はなくなる
// 1回の通信・1つのトランザクションで行い、移したあとのこのPCの所持品をすべて返す
const SAME_ITEM_KEYS = ['name', 'size', 'per_slot', 'effect', 'modifiers', 'shop_item_id', 'magic_id']

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const pcId = Number(getRouterParam(event, 'id'))
  const { pc } = await requirePcOwner(event, db, pcId)

  const { moves } = (await readBody(event)) ?? {}
  if (!Array.isArray(moves) || moves.length === 0 || moves.length > 200) {
    throw createError({ statusCode: 400, statusMessage: '移動する所持品を指定してください' })
  }

  const { results } = await db.prepare('SELECT * FROM pc_items WHERE pc_id = ?').bind(pc.id).all()
  // 手元で移動を組み立ててから、まとめて書き込む
  const rows = new Map(results.map((r) => [r.id, { ...r }]))
  const created = [] // 新しく作る行(移す先に同じ品物がないとき)

  for (const m of moves) {
    const src = rows.get(Number(m?.id))
    if (!src || !ITEM_CATEGORIES.includes(m?.category)) {
      throw createError({ statusCode: 400, statusMessage: '移動の指定が不正です' })
    }
    if (src.category === m.category) continue
    if ((src.shop_item_id || src.magic_id) && (src.category === 'equipment' || m.category === 'equipment')) {
      throw createError({ statusCode: 400, statusMessage: `「${src.name}」は${src.magic_id ? '魔道具・AF' : '店の商品'}なので、荷物と倉庫の間でしか移せません` })
    }
    const qty = m.quantity === undefined ? src.quantity : Number(m.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > src.quantity) {
      throw createError({ statusCode: 400, statusMessage: `「${src.name}」は1〜${src.quantity}個の範囲で移してください` })
    }

    const isSame = (r) => r.category === m.category && SAME_ITEM_KEYS.every((k) => (r[k] ?? null) === (src[k] ?? null))
    const target = [...rows.values()].find((r) => r.id !== src.id && isSame(r)) ?? created.find(isSame)

    if (target) {
      target.quantity += qty
      src.quantity -= qty
    } else if (qty === src.quantity) {
      // 全部移すだけなら区分を変えるだけ
      src.category = m.category
    } else {
      created.push({ ...src, id: null, category: m.category, quantity: qty })
      src.quantity -= qty
    }
  }

  const statements = []
  for (const r of rows.values()) {
    const before = results.find((x) => x.id === r.id)
    if (r.quantity === 0) {
      statements.push(db.prepare('DELETE FROM pc_items WHERE id = ? AND pc_id = ?').bind(r.id, pc.id))
    } else if (r.quantity !== before.quantity || r.category !== before.category) {
      statements.push(
        db.prepare('UPDATE pc_items SET quantity = ?, category = ? WHERE id = ? AND pc_id = ?').bind(r.quantity, r.category, r.id, pc.id)
      )
    }
  }
  for (const r of created) {
    statements.push(
      db
        .prepare(
          `INSERT INTO pc_items (pc_id, name, quantity, size, per_slot, category, effect, modifiers, shop_item_id, magic_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(pc.id, r.name, r.quantity, r.size, r.per_slot, r.category, r.effect, r.modifiers, r.shop_item_id, r.magic_id)
    )
  }
  if (statements.length) await db.batch(statements)

  const { results: items } = await db.prepare('SELECT * FROM pc_items WHERE pc_id = ? ORDER BY id ASC').bind(pc.id).all()
  return { success: true, items: items.map(formatPcItem) }
})
