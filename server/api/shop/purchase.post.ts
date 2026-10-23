import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { invalidateCache } from '../../utils/cache'
import { isDiscountActive } from '../../utils/shop'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  // discount: 画面で割引価格を見て買ったか(画面を開いている間に割引が終わった場合に、知らずに通常価格で買わないようにする)
  const { pcId, itemId, quantity, discount } = (await readBody(event)) ?? {}
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

  // 割引の在庫が残っている間は割引販売、なくなったら通常販売
  const useDiscount = isDiscountActive(item)
  if (discount !== undefined && Boolean(discount) !== useDiscount) {
    throw createError({
      statusCode: 409,
      statusMessage: useDiscount ? '割引販売が始まりました。価格を確認してください' : '割引販売が終わりました。価格を確認してください',
    })
  }
  const unitPrice = useDiscount ? item.discount_price : item.price
  const total = unitPrice * qty
  if (useDiscount) {
    // 割引中は割引の残り個数までしか買えない
    if (item.discount_stock < qty) {
      throw createError({ statusCode: 409, statusMessage: `割引の残りは${item.discount_stock}個です` })
    }
  } else if (item.stock !== null && item.stock < qty) {
    throw createError({ statusCode: 409, statusMessage: '在庫が足りません' })
  }
  // 出納帳のPCは実際の所持金がココフォリア側にあるので残高を確かめない
  const isLedger = pc.money_mode === 'ledger'
  if (!isLedger && pc.money < total) {
    throw createError({ statusCode: 409, statusMessage: '所持金が足りません' })
  }

  // 購入したPC自身が販売者の場合は受け取れない
  const sellerTable = useDiscount ? 'shop_item_discount_sellers' : 'shop_item_sellers'
  const { results: sellers } = await db
    .prepare(`SELECT pc_id, amount FROM ${sellerTable} WHERE item_id = ? AND pc_id != ?`)
    .bind(item.id, pc.id)
    .all()

  // 所持金・在庫が0未満になるとCHECK制約違反でバッチ全体がロールバックされる
  // (所持金は pcs 側に制約がないので balance_checks に一度入れて確かめる)
  try {
    await db.batch([
      db
        .prepare('UPDATE pcs SET money = money - ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(total, pc.id),
      ...(isLedger ? [] : [db.prepare('INSERT INTO balance_checks (money) SELECT money FROM pcs WHERE id = ?').bind(pc.id)]),
      db.prepare('DELETE FROM balance_checks'),
      useDiscount
        ? db.prepare('UPDATE shop_items SET discount_stock = discount_stock - ? WHERE id = ?').bind(qty, item.id)
        : db
            .prepare('UPDATE shop_items SET stock = CASE WHEN stock IS NULL THEN NULL ELSE stock - ? END WHERE id = ?')
            .bind(qty, item.id),
      db
        .prepare(
          `INSERT INTO purchases (pc_id, item_id, shop, item_name, price, quantity, total, purchased_by, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(pc.id, item.id, item.shop, item.name, unitPrice, qty, total, currentUser.id, useDiscount ? 1 : 0),
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
  invalidateCache('shop:items')

  return { success: true, money: updated.money }
})
