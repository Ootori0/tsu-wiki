// CoC6版のステータス(SANはココフォリアで管理するので持たない。HP/MPは最大値のみ)
export const STAT_KEYS = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'HP', 'MP']

// 能力値から決まる値(入力がないときの目安・技能の基本値)
export function derivedStats(stats) {
  const s = (k) => Number(stats?.[k]) || 0
  const strSiz = s('STR') + s('SIZ')
  let db = '-'
  // STR と SIZ の両方が入っているときだけ出す
  if (s('STR') && s('SIZ')) {
    if (strSiz <= 12) db = '-1D6'
    else if (strSiz <= 16) db = '-1D4'
    else if (strSiz <= 24) db = '0'
    else if (strSiz <= 32) db = '+1D4'
    else if (strSiz <= 40) db = '+1D6'
    else db = `+${Math.ceil((strSiz - 40) / 16) + 1}D6`
  }
  return {
    hp: s('CON') && s('SIZ') ? Math.ceil((s('CON') + s('SIZ')) / 2) : null,
    mp: s('POW') || null,
    idea: s('INT') * 5 || null,
    luck: s('POW') * 5 || null,
    know: s('EDU') * 5 || null,
    db,
  }
}

// 荷物の大きさ: 大5・中3・小1。上限20
export const LOAD_LIMIT = 20
export const ITEM_SIZES = [
  { value: 'large', label: '大', points: 5 },
  { value: 'medium', label: '中', points: 3 },
  { value: 'small', label: '小', points: 1 },
  { value: 'none', label: 'なし', points: 0 },
]
// 所持品の区分
export const ITEM_CATEGORIES = [
  { value: 'cargo', label: '荷物', note: 'コストに数える。「倉庫へ」で個数を選び「移動を確定」' },
  { value: 'storage', label: '倉庫', note: 'コストにも補正にも数えない。「荷物へ」で個数を選び「移動を確定」' },
  { value: 'equipment', label: '装備・装飾品', note: 'コストに数えない・ステータス補正あり' },
]
export const categoryLabel = (value) => ITEM_CATEGORIES.find((c) => c.value === value)?.label ?? '倉庫'
export const itemsOf = (items, category) => (items ?? []).filter((item) => (item.category ?? 'cargo') === category)

const sizeOf = (value) => ITEM_SIZES.find((s) => s.value === value) ?? ITEM_SIZES[3]
export const sizeLabel = (value) => sizeOf(value).label

// 所持品1つ分のコスト: 「何個で1つ分」の単位に切り上げて、大きさの点数を掛ける(御札10枚で小 → 11枚なら小2つ分)
export function itemCost(item) {
  const slots = Math.ceil((Number(item.quantity) || 0) / (Number(item.per_slot) || 1))
  return slots * sizeOf(item.size).points
}

// 荷物のコストの合計(装備品・倉庫は数えない)
export function totalCost(items) {
  return itemsOf(items, 'cargo').reduce((sum, item) => sum + itemCost(item), 0)
}

// 装備品のステータス補正の合計
export function totalModifiers(items) {
  const sum = {}
  for (const item of itemsOf(items, 'equipment')) {
    if (!item.quantity) continue
    for (const [k, v] of Object.entries(item.modifiers ?? {})) sum[k] = (sum[k] ?? 0) + v
  }
  for (const k of Object.keys(sum)) if (!sum[k]) delete sum[k]
  return sum
}

export const formatModifier = (v) => (v > 0 ? `+${v}` : `${v}`)
// ステータスの並び順で「STR+2 DEX-1」の形にする
export const modifiersText = (mods) =>
  STAT_KEYS.filter((k) => mods?.[k]).map((k) => `${k}${formatModifier(mods[k])}`).join(' ')

// ココフォリアに貼る荷物の一覧(装備品も添える。倉庫は出さない)
export function loadCheckText(pcName, items) {
  const lines = itemsOf(items, 'cargo')
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const per = item.per_slot > 1 ? `/${item.per_slot}個` : ''
      const size = item.size === 'none' ? 'なし' : `${sizeLabel(item.size)}${per}`
      return `・${item.name}×${item.quantity} [${size}] ${itemCost(item)}`
    })
  const total = totalCost(items)
  const equipment = itemsOf(items, 'equipment').filter((item) => item.quantity > 0)
  const mods = modifiersText(totalModifiers(items))
  return [
    `【荷物】${pcName} コスト ${total}/${LOAD_LIMIT}${total > LOAD_LIMIT ? ' ※超過' : ''}`,
    ...lines,
    ...(equipment.length
      ? [
          `【装備】${mods ? `補正 ${mods}` : ''}`,
          ...equipment.map((item) => `・${item.name}${item.quantity > 1 ? `×${item.quantity}` : ''}${Object.keys(item.modifiers ?? {}).length ? ` (${modifiersText(item.modifiers)})` : ''}`),
        ]
      : []),
  ].join('\n')
}

// 所持品として倉庫に入る魔法の区分
export const ITEM_MAGIC_TYPES = ['魔道具', 'AF']
