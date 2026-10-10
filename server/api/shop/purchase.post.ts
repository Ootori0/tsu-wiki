import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { pcId, itemId, quantity } = (await readBody(event)) ?? {}
  const qty = Number(quantity ?? 1)
  if (!Number.isInteger(qty) || qty < 1) {
    throw createError({ statusCode: 400, statusMessage: '個数は1以上の整数で指定してください' })
  }

  const pc = await db.prepare('SELECT * FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '自分のPCでのみ購入できます' })
  }

  const item = await db.prepare('SELECT * FROM shop_items WHERE id = ?').bind(itemId).first()
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: '商品が見つかりません' })
  }

  const total = item.price * qty
  if (item.stock !== null && item.stock < qty) {
    throw createError({ statusCode: 409, statusMessage: '在庫が足りません' })
  }
  if (pc.money < total) {
    throw createError({ statusCode: 409, statusMessage: '所持金が足りません' })
  }

  // 購入したPC自身が販売者の場合は受け取れない
  const { results: sellers } = await db
    .prepare('SELECT pc_id, amount FROM shop_item_sellers WHERE item_id = ? AND pc_id != ?')
    .bind(item.id, pc.id)
    .all()

  // 所持金・在庫が0未満になるとCHECK制約違反でバッチ全体がロールバックされる
  // (所持金は pcs 側に制約がないので balance_checks に一度入れて確かめる)
  try {
    await db.batch([
      db
        .prepare('UPDATE pcs SET money = money - ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(total, pc.id),
      db.prepare('INSERT INTO balance_checks (money) SELECT money FROM pcs WHERE id = ?').bind(pc.id),
      db.prepare('DELETE FROM balance_checks'),
      db
        .prepare('UPDATE shop_items SET stock = CASE WHEN stock IS NULL THEN NULL ELSE stock - ? END WHERE id = ?')
        .bind(qty, item.id),
      db
        .prepare(
          `INSERT INTO purchases (pc_id, item_id, shop, item_name, price, quantity, total, purchased_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(pc.id, item.id, item.shop, item.name, item.price, qty, total, currentUser.id),
      // 販売者へ「1個あたりの金額×個数」を支払う
      ...sellers.flatMap((s) => [
        db
          .prepare('UPDATE pcs SET money = money + ?, updated_at = datetime(\'now\') WHERE id = ?')
          .bind(s.amount * qty, s.pc_id),
        db
          .prepare(
            'INSERT INTO purchase_payouts (purchase_id, pc_id, amount) VALUES ((SELECT MAX(id) FROM purchases), ?, ?)'
          )
          .bind(s.pc_id, s.amount * qty),
      ]),
    ])
  } catch {
    throw createError({ statusCode: 409, statusMessage: '在庫または所持金が足りません' })
  }

  const updated = await db.prepare('SELECT money FROM pcs WHERE id = ?').bind(pc.id).first()
  return { success: true, money: updated.money }
})
