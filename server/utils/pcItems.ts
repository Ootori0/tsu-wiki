// CoC6版のステータス(SANはココフォリアで管理するので持たない。HP/MPは最大値のみ)
export const STAT_KEYS = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'HP', 'MP']
export const ITEM_SIZES = ['large', 'medium', 'small', 'none']
// 所持品の区分: 荷物(コストに数える)・装備品(コスト免除、ステータス補正あり)・倉庫(どちらにも数えない)
export const ITEM_CATEGORIES = ['cargo', 'equipment', 'storage']

export function parseCategory(category, fallback = 'cargo') {
  return ITEM_CATEGORIES.includes(category) ? category : fallback
}

// { STR: 12, ... } の形に整える(数値でない・範囲外のものは捨てる)
export function parseStats(input) {
  const out = {}
  for (const key of STAT_KEYS) {
    const v = input?.[key]
    if (v === '' || v === null || v === undefined) continue
    const n = Number(v)
    if (Number.isInteger(n) && Math.abs(n) <= 999) out[key] = n
  }
  return out
}

// 補正: 0 は持たない
export function parseModifiers(input) {
  const out = parseStats(input)
  for (const key of Object.keys(out)) if (out[key] === 0) delete out[key]
  return out
}

export function parseSize(size) {
  return ITEM_SIZES.includes(size) ? size : 'none'
}

export function parsePerSlot(perSlot) {
  const n = Number(perSlot ?? 1)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

// 所持品の入力
export function parsePcItemBody(body) {
  const name = String(body?.name ?? '').trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: '名前を入力してください' })
  }
  const quantity = Number(body?.quantity ?? 1)
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw createError({ statusCode: 400, statusMessage: '個数は0以上の整数で指定してください' })
  }
  return {
    name,
    quantity,
    size: parseSize(body?.size),
    perSlot: parsePerSlot(body?.perSlot),
    category: parseCategory(body?.category),
    effect: String(body?.effect ?? ''),
    modifiers: JSON.stringify(parseModifiers(body?.modifiers)),
  }
}

export function formatPcItem(r) {
  return { ...r, modifiers: JSON.parse(r.modifiers || '{}') }
}
