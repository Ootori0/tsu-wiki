import { cached, invalidateCache } from './cache'
import { todayStartUtc, dealerDeltaOf } from './chinchiro'
import { FULL_DECK, HAND_KEYS, bestHand, handRank } from '../../shared/utils/showdownCards'

// カジノの「Showdown」(魔術《Showdown》を元にした、ディーラーとのカード勝負)
// 1. 掛金を払うと、ディーラーが53枚から7枚を引く(左4枚が公開札、右3枚が手札)。ディーラーは役を宣言する(嘘のこともある)
// 2. プレイヤーは Raise(料金を払って公開札を1枚破る)/ Check(降りて掛金の半分を受け取る)/ Call(勝負)を選ぶ
// 3. 勝負では空札を引き直し、7枚から一番強い5枚で実際の役を決める
//    - 実際の役が宣言より弱い(嘘): プレイヤーの勝ち。宣言した役の倍率で払い戻す
//    - 宣言どおり: ディーラーのダメージ(役札の合計×倍率)とプレイヤーのダメージ(ダイス)を相殺し、余った方の勝ち
//      プレイヤーの勝ちなら実際の役の倍率で払い戻す。同じなら掛金が戻る

export const PUBLIC_SLOTS = 4
export const SLOTS = 7

export const DEFAULT_SETTINGS = {
  // 勝ったときの払い戻し倍率(掛金込み)。「毎回すぐ勝負する」遊び方で期待値が約0.97倍になるように調整
  payouts: { high: 1.1, one_pair: 1.3, two_pair: 1.4, three: 1.6, straight: 1.8, flush: 2, full_house: 2.5, four: 4, straight_flush: 6, five: 10 },
  bluffRate: 30, // ディーラーが実際より強い役を宣言する確率(%)
  raiseFee: 10, // Raise 1回の料金(掛金の%)
  raiseMax: 3, // Raise できる回数
  dailyLimit: 8, // PCごとの1日の回数(日本時間0時に戻る)
  diceCount: 3, // プレイヤーのダメージのダイス(3d10 なら 3 と 10)
  diceSides: 10,
  dealerPcId: null,
  dealerShare: 100,
}

const KEY = 'showdown_settings'

export function loadShowdownSettings(event, db) {
  return cached(event, 'casino:showdown', async () => {
    const row = await db.prepare('SELECT value FROM casino_settings WHERE key = ?').bind(KEY).first()
    let saved = {}
    try {
      saved = row?.value ? JSON.parse(row.value) : {}
    } catch {
      saved = {}
    }
    const settings = { ...DEFAULT_SETTINGS, ...saved, payouts: { ...DEFAULT_SETTINGS.payouts, ...(saved.payouts ?? {}) } }
    let dealerPcName = null
    if (settings.dealerPcId) {
      const pc = await db.prepare('SELECT name FROM pcs WHERE id = ?').bind(settings.dealerPcId).first()
      if (pc) dealerPcName = pc.name
      else settings.dealerPcId = null // ディーラーのPCが削除済み
    }
    return { ...settings, dealerPcName }
  })
}

// 管理画面からの保存。値を確かめて保存した設定を返す
export async function saveShowdownSettings(db, body) {
  const intIn = (v, min, max, label) => {
    const n = Number(v)
    if (!Number.isInteger(n) || n < min || n > max) {
      throw createError({ statusCode: 400, statusMessage: `${label}は${min}〜${max}の整数で指定してください` })
    }
    return n
  }
  const payouts = {}
  for (const key of HAND_KEYS) {
    const raw = Number(body?.payouts?.[key])
    if (!Number.isFinite(raw) || raw < 0 || Math.abs(Math.round(raw * 100) - raw * 100) > 1e-9) {
      throw createError({ statusCode: 400, statusMessage: '倍率は0以上・小数第2位までの数値で指定してください' })
    }
    payouts[key] = Math.round(raw * 100) / 100
  }
  const dealerPcId = body?.dealerPcId === null || body?.dealerPcId === undefined || body?.dealerPcId === '' ? null : Number(body.dealerPcId)
  if (dealerPcId !== null) {
    const pc = await db.prepare('SELECT id FROM pcs WHERE id = ?').bind(dealerPcId).first()
    if (!pc) throw createError({ statusCode: 400, statusMessage: 'ディーラーのPCが見つかりません' })
  }
  const settings = {
    payouts,
    bluffRate: intIn(body?.bluffRate, 0, 100, '嘘の確率'),
    raiseFee: intIn(body?.raiseFee, 0, 100, 'Raise の料金'),
    raiseMax: intIn(body?.raiseMax, 0, PUBLIC_SLOTS, 'Raise の回数'),
    dailyLimit: intIn(body?.dailyLimit, 1, 100, '1日の回数'),
    diceCount: intIn(body?.diceCount, 1, 20, 'ダイスの数'),
    diceSides: intIn(body?.diceSides, 2, 100, 'ダイスの面'),
    dealerPcId,
    dealerShare: intIn(body?.dealerShare, 0, 100, 'ディーラーの割合'),
  }
  await db
    .prepare('INSERT INTO casino_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(KEY, JSON.stringify(settings))
    .run()
  invalidateCache('casino:showdown')
  return settings
}

// --- 乱数(偏りのない整数) ---
function randInt(n) {
  const limit = Math.floor(0x100000000 / n) * n
  const buf = new Uint32Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0] >= limit)
  return buf[0] % n
}

// 場にある札と重ならないように、空札の枠に札を引く
export function fillEmpty(cards) {
  const used = new Set(cards.filter(Boolean))
  const deck = FULL_DECK.filter((c) => !used.has(c))
  return cards.map((c) => {
    if (c) return c
    const i = randInt(deck.length)
    return deck.splice(i, 1)[0]
  })
}

export function rollDice(count, sides) {
  return Array.from({ length: count }, () => randInt(sides) + 1)
}

// ディーラーの宣言: bluffRate% の確率で、実際より1〜3段強い役を名乗る(それ以外は実際の役)
export function declareHand(cards, bluffRate) {
  const actual = bestHand(cards).rank
  if (actual < HAND_KEYS.length - 1 && randInt(100) < bluffRate) {
    return HAND_KEYS[Math.min(HAND_KEYS.length - 1, actual + 1 + randInt(3))]
  }
  return HAND_KEYS[actual]
}

// 勝負: 空札を引き直して決着をつける
export function resolveShowdown(game, settings) {
  const cards = fillEmpty(game.cards)
  const hand = bestHand(cards)
  const declaredRank = handRank(game.declared)
  const bluff = hand.rank < declaredRank
  const detail = { cards, handCards: hand.roleCards, hand: hand.key, declared: game.declared, bluff, sum: hand.sum, dealerDamage: hand.damage }

  if (bluff) {
    return { status: 'win', payout: Math.floor(game.bet * settings.payouts[game.declared]), hand: hand.key, detail }
  }
  const dice = rollDice(settings.diceCount, settings.diceSides)
  const playerDamage = dice.reduce((a, b) => a + b, 0)
  Object.assign(detail, { dice, playerDamage })
  if (playerDamage > hand.damage) {
    return { status: 'win', payout: Math.floor(game.bet * settings.payouts[hand.key]), hand: hand.key, detail }
  }
  if (playerDamage === hand.damage) return { status: 'push', payout: game.bet, hand: hand.key, detail }
  return { status: 'lose', payout: 0, hand: hand.key, detail }
}

export function newGameCards() {
  return fillEmpty(Array(SLOTS).fill(null))
}

export function countShowdownToday(db, pcId) {
  return db
    .prepare('SELECT COUNT(*) AS c FROM showdown_games WHERE pc_id = ? AND created_at >= ?')
    .bind(pcId, todayStartUtc())
}

// 画面に返す形(勝負中は手札を伏せる)
export function publicGame(row) {
  if (!row) return null
  const cards = JSON.parse(row.cards)
  const done = row.status !== 'playing'
  return {
    id: row.id,
    pcId: row.pc_id,
    bet: row.bet,
    raises: row.raises,
    raiseFeeTotal: row.raise_fee_total,
    status: row.status,
    declared: row.declared,
    publicCards: cards.slice(0, PUBLIC_SLOTS),
    hiddenCards: done ? cards.slice(PUBLIC_SLOTS) : null,
    result: done && row.result ? JSON.parse(row.result) : null,
    payout: row.payout,
    net: row.net,
    dealerPcId: row.dealer_pc_id,
    dealerDelta: row.dealer_delta,
    createdAt: row.created_at,
  }
}
