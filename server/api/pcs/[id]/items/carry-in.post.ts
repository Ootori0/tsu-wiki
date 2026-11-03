import { requirePcOwner } from '../../../../utils/pcAccess'
import { formatPcItem } from '../../../../utils/pcItems'

// 持ち込み: 過去や別のルートで手に入れた店の商品を所持品に追加する(PCの作成者/admin)
// 代金は0で、店の在庫も減らさない。購入履歴に「持ち込み」として残す(取り消し・admin の削除で所持品からも減る)
// body: { itemId, quantity }(quantity は所持品に入れる個数。セット販売の商品でも1個単位)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { currentUser, pc } = await requirePcOwner(event, db, Number(getRouterParam(event, 'id')))
  const { itemId, quantity } = (await readBody(event)) ?? {}

  const qty = Number(quantity ?? 1)
  if (!Number.isInteger(qty) || qty < 1) {
    throw createError({ statusCode: 400, statusMessage: '個数は1以上の整数で指定してください' })
  }
  const item = await db.prepare('SELECT * FROM shop_items WHERE id = ?').bind(itemId).first()
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: '商品が見つかりません' })
  }

  const category = item.item_category ?? 'storage'
  await db.batch([
    db
      .prepare(
        `INSERT INTO purchases (pc_id, item_id, shop, item_name, price, quantity, total, purchased_by, discount, set_size, carry_in)
         VALUES (?, ?, ?, ?, 0, ?, 0, ?, 0, 1, 1)`
      )
      .bind(pc.id, item.id, item.shop, item.name, qty, currentUser.id),
    // 購入と同じく、同じ商品を持っていれば1行に足す(商品で決めた区分の行を優先)
    db
      .prepare(
        `UPDATE pc_items SET quantity = quantity + ?
         WHERE id = (
           SELECT id FROM pc_items WHERE pc_id = ? AND shop_item_id = ?
           ORDER BY (category = ?) DESC, id ASC LIMIT 1
         )`
      )
      .bind(qty, pc.id, item.id, category),
    db
      .prepare(
        `INSERT INTO pc_items (pc_id, name, quantity, size, per_slot, category, effect, modifiers, shop_item_id)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM pc_items WHERE pc_id = ? AND shop_item_id = ?)`
      )
      .bind(
        pc.id, item.name, qty, item.item_size ?? 'none', item.item_per_slot ?? 1, category,
        item.description ?? '', item.item_modifiers ?? '{}', item.id, pc.id, item.id,
      ),
  ])

  const [purchase, { results }] = await Promise.all([
    db.prepare('SELECT MAX(id) AS id FROM purchases WHERE pc_id = ? AND purchased_by = ?').bind(pc.id, currentUser.id).first(),
    db.prepare('SELECT * FROM pc_items WHERE pc_id = ? ORDER BY id ASC').bind(pc.id).all(),
  ])
  // 画面で読み込み直さずに済むよう、PCの所持品をすべて返す。purchaseId は直前の操作の取り消しに使う
  return { success: true, items: results.map(formatPcItem), purchaseId: purchase?.id ?? null }
})
