export const SHOPS = ['魔法店', '武器屋']

export function parseShopItemBody(body) {
  const { shop, name, price, stock, description, sellers, discountEnabled, discountPrice, discountStock, discountSellers } = body ?? {}

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

  // 割引販売(通常販売とは別の価格・在庫・販売者)
  let discount = { price: null, stock: 0, sellers: [] }
  if (discountEnabled) {
    const dPrice = Number(discountPrice)
    if (!Number.isInteger(dPrice) || dPrice < 0) {
      throw createError({ statusCode: 400, statusMessage: '割引価格は0以上の整数で指定してください' })
    }
    const dStock = Number(discountStock)
    if (!Number.isInteger(dStock) || dStock < 0) {
      throw createError({ statusCode: 400, statusMessage: '割引の在庫は0以上の整数で指定してください' })
    }
    discount = { price: dPrice, stock: dStock, sellers: parseSellers(discountSellers) }
  }

  return {
    shop,
    name,
    price: priceNum,
    stock: stockNum,
    description: description ?? '',
    sellers: parseSellers(sellers),
    discount,
  }
}

// 割引販売中か(割引が設定されていて、割引の在庫が残っている)
export function isDiscountActive(item) {
  return item.discount_price !== null && item.discount_price !== undefined && item.discount_stock > 0
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

export function sellerInsertStatements(db, itemIdExpr, itemIdParams, sellers, table = 'shop_item_sellers') {
  return sellers.map((s) =>
    db
      .prepare(`INSERT INTO ${table} (item_id, pc_id, amount) VALUES (${itemIdExpr}, ?, ?)`)
      .bind(...itemIdParams, s.pcId, s.amount)
  )
}
