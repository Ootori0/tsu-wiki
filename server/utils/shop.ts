export const SHOPS = ['魔法店', '武器屋']

export function parseShopItemBody(body) {
  const { shop, name, price, stock, description } = body ?? {}

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

  return { shop, name, price: priceNum, stock: stockNum, description: description ?? '' }
}
