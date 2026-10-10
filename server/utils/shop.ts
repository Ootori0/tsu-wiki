export const SHOPS = ['魔法店', '武器屋']

export function parseShopItemBody(body) {
  const { shop, name, price, stock, description, sellers } = body ?? {}

  if (!SHOPS.includes(shop)) {
    throw createError({ statusCode: 400, statusMessage: '店の種類が不正です' })
  }
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const priceNum = Number(price)
  if (!Number.isInteger(priceNum) || priceNum < 0) {
    throw createError({ statusCode: 400, statusMessage: '価格は0以上の整数で指定してください' })
  }

  // 空欄は在庫無制限
  let stockNum = null
  if (stock !== null && stock !== undefined && stock !== '') {
    stockNum = Number(stock)
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      throw createError({ statusCode: 400, statusMessage: '在庫は0以上の整数で指定してください' })
    }
  }

  return {
    shop,
    name,
    price: priceNum,
    stock: stockNum,
    description: description ?? '',
    sellers: parseSellers(sellers),
  }
}

// 販売者: [{ pcId, amount }] (amount は1個売れるごとに入る金額)
function parseSellers(sellers) {
  if (!Array.isArray(sellers)) return []
  const seen = new Set()
  return sellers.map((s) => {
    const pcId = Number(s?.pcId)
    const amount = Number(s?.amount)
    if (!Number.isInteger(pcId)) {
      throw createError({ statusCode: 400, statusMessage: '販売者のPCを選択してください' })
    }
    if (seen.has(pcId)) {
      throw createError({ statusCode: 400, statusMessage: '同じ販売者が重複しています' })
    }
    seen.add(pcId)
    if (!Number.isInteger(amount) || amount < 0) {
      throw createError({ statusCode: 400, statusMessage: '販売者の金額は0以上の整数で指定してください' })
    }
    return { pcId, amount }
  })
}

export async function assertSellersExist(db, sellers) {
  for (const s of sellers) {
    const pc = await db.prepare('SELECT id FROM pcs WHERE id = ?').bind(s.pcId).first()
    if (!pc) {
      throw createError({ statusCode: 400, statusMessage: '販売者のPCが見つかりません' })
    }
  }
}

export function sellerInsertStatements(db, itemIdExpr, itemIdParams, sellers) {
  return sellers.map((s) =>
    db
      .prepare(`INSERT INTO shop_item_sellers (item_id, pc_id, amount) VALUES (${itemIdExpr}, ?, ?)`)
      .bind(...itemIdParams, s.pcId, s.amount)
  )
}
