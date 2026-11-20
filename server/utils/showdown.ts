import { cached, invalidateCache } from './cache'
import { todayStartUtc } from './chinchiro'
import { FULL_DECK, HAND_KEYS, bestHand, handRank, handBuff } from '../../shared/utils/showdownCards'

// カジノの「Showdown」(魔術《Showdown》を元にした、ディーラーとの MP の削り合い)
//
// 流れ: 札配り(ディーラー) → 宣言 → プレイヤーの行動 → ディーラーの行動 → プレイヤーの行動 …
// - プレイヤーの行動(どれも攻撃なので MP 4d6 を使う)
//   Call:  勝負(Showdown)。終わったら場の札を捨て、ディーラーが札を配り直す
//   Raise: 公開札を攻撃する。ダメージ13ごとに札が1枚破れ、ディーラーは宣言し直す
//   Check: ディーラーに通常攻撃する
// - ディーラーの行動(攻撃なので MP 1d6 を使う。通常攻撃は 2d10 + 役のバフ)
//   Raise: 自分の札のうち破ったほうがよい札を破り、宣言し直す
//   Check: プレイヤーに通常攻撃する
//   ターン終了時に破れた札を引き直す(1枚につき MP 1d8)= The River
// - どちらかの MP が0を下回ったら終わり。(プレイヤーのMP - ディーラーのMP) × レート を精算する
//
// 判定は d100 と技能値(全員共通)を比べ、失敗/通常/ハード/イクストリームの成功強度を出す
// 回避の軽減率: 回避側の成功強度が 1段階上以上 100% / 同じ 80% / 1段階下 50% / 2段階下 20% / 3段階以下 0%
// 場に札がある間、ディーラーは宣言した役の倍率に応じて 回避の軽減率 +倍率×7%、攻撃のダメージ +(倍率d13)/2 を得る

export const PUBLIC_SLOTS = 4
export const SLOTS = 7
const CARD_DURABILITY = 13

export const DEFAULT_SETTINGS = {
  skill: 85, // 全員の技能値(攻撃・回避・《Showdown》)
  playerMp: 80,
  dealerMp: 80,
  playerDice: { count: 6, sides: 10 }, // プレイヤーの攻撃のダメージ
  dealerDice: { count: 2, sides: 10 }, // ディーラーの通常攻撃のダメージ(これに役のバフが加わる)
  playerAttackCost: { count: 4, sides: 6 }, // プレイヤーの攻撃(Call・Raise・Check)に使う MP
  dealerAttackCost: { count: 1, sides: 6 }, // ディーラーの攻撃(Raise・Check)に使う MP
  rate: 10, // 精算のレート(1MPあたりの万円)
  bluffRate: 30, // ディーラーが実際より強い役を宣言する確率(%)
  dealerRaiseRate: 53, // ディーラーが Raise(自分の札を破る)を選ぶ確率(%)。破る意味のある札がないときは Check。ほぼ最適なプレイヤーの期待値が約 +30万円になるように調整
  riverRate: 100, // ディーラーがターン終了時に破れた札を引き直す確率(%)
  dailyLimit: 8, // PCごとの1日の回数(日本時間0時に戻る)
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
    const settings = {}
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      settings[k] = v && typeof v === 'object' ? { ...v, ...(saved[k] ?? {}) } : (saved[k] ?? v)
    }
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
  const dice = (v, label) => ({ count: intIn(v?.count, 1, 30, `${label}のダイスの数`), sides: intIn(v?.sides, 2, 100, `${label}のダイスの面`) })
  const dealerPcId = body?.dealerPcId === null || body?.dealerPcId === undefined || body?.dealerPcId === '' ? null : Number(body.dealerPcId)
  if (dealerPcId !== null) {
    const pc = await db.prepare('SELECT id FROM pcs WHERE id = ?').bind(dealerPcId).first()
    if (!pc) throw createError({ statusCode: 400, statusMessage: 'ディーラーのPCが見つかりません' })
  }
  const settings = {
    skill: intIn(body?.skill, 1, 99, '技能値'),
    playerMp: intIn(body?.playerMp, 1, 999, 'プレイヤーの MP'),
    dealerMp: intIn(body?.dealerMp, 1, 999, 'ディーラーの MP'),
    playerDice: dice(body?.playerDice, 'プレイヤーの攻撃'),
    dealerDice: dice(body?.dealerDice, 'ディーラーの攻撃'),
    playerAttackCost: dice(body?.playerAttackCost, 'プレイヤーの攻撃の MP'),
    dealerAttackCost: dice(body?.dealerAttackCost, 'ディーラーの攻撃の MP'),
    rate: intIn(body?.rate, 0, 10000, 'レート'),
    bluffRate: intIn(body?.bluffRate, 0, 100, '嘘の確率'),
    dealerRaiseRate: intIn(body?.dealerRaiseRate, 0, 100, 'ディーラーの Raise の確率'),
    riverRate: intIn(body?.riverRate, 0, 100, '引き直しの確率'),
    dailyLimit: intIn(body?.dailyLimit, 1, 100, '1日の回数'),
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
const roll = (count, sides) => Array.from({ length: count }, () => randInt(sides) + 1)
const total = (arr) => arr.reduce((a, b) => a + b, 0)

// 場にある札と重ならないように、空札の枠に札を引く(引いた枠の番号も返す)
function fillEmpty(cards, slots = null) {
  const used = new Set(cards.filter(Boolean))
  const deck = FULL_DECK.filter((c) => !used.has(c))
  const filled = []
  const next = cards.map((c, i) => {
    if (c || (slots && !slots.includes(i))) return c
    filled.push(i)
    return deck.splice(randInt(deck.length), 1)[0]
  })
  return { cards: next, filled }
}

// 公開札から見て、その役があり得るか(伏せ札の枠をランダムに埋めて、その役以上が一度でも出るか)
function plausible(cards, rank, tries = 200) {
  const known = cards.map((c, i) => (i < PUBLIC_SLOTS ? c : null))
  for (let k = 0; k < tries; k++) {
    if (bestHand(fillEmpty(known).cards).rank >= rank) return true
  }
  return false
}

// ディーラーの宣言
// - 嘘は勝負(Call)されると大きく損をするので、このゲームでプレイヤーが Call を選んだ割合が高いほど嘘を減らす
//   嘘をつく確率 = bluffRate% × (1 - Call の割合)。Call の割合は (Call の回数 + 1) / (行動の回数 + 2) で見積もる
// - 名乗るのは実際より1段上が多く(60%)、2段上(30%)、3段上(10%)の順。公開札から見てあり得ない役は名乗らない
// - それ以外は実際の役をそのまま宣言する(宣言より強い役は「宣言どおり」扱いで、反撃は宣言した役の倍率になるため)
function declareHand(cards, bluffRate, history = { calls: 0, actions: 0 }) {
  const actual = bestHand(cards).rank
  const callRatio = (history.calls + 1) / (history.actions + 2)
  if (actual < HAND_KEYS.length - 1 && randInt(10000) < bluffRate * 100 * (1 - callRatio)) {
    const r = randInt(10)
    const step = r < 6 ? 1 : r < 9 ? 2 : 3
    for (let claim = Math.min(HAND_KEYS.length - 1, actual + step); claim > actual; claim--) {
      if (plausible(cards, claim)) return HAND_KEYS[claim]
    }
  }
  return HAND_KEYS[actual]
}

// 成功強度: 0 失敗 / 1 通常 / 2 ハード / 3 イクストリーム
export const LEVEL_LABELS = ['失敗', '通常成功', 'ハード成功', 'イクストリーム成功']
function skillRoll(skill, { straight = false } = {}) {
  const value = randInt(100) + 1
  let level = value <= Math.floor(skill / 5) ? 3 : value <= Math.floor(skill / 2) ? 2 : value <= skill ? 1 : 0
  const upgraded = straight && level === 2
  if (upgraded) level = 3
  return { value, level, upgraded }
}

// 回避の軽減率(0〜1)
function mitigation(defLevel, atkLevel) {
  const diff = defLevel - atkLevel
  if (diff >= 1) return 1
  if (diff === 0) return 0.8
  if (diff === -1) return 0.5
  if (diff === -2) return 0.2
  return 0
}

// --- 1回の勝負の進行 ---
// state: { cards, declared, playerMp, dealerMp }。events に起きたことを順に積む(画面はこれを順に見せる)
function createRun(state, settings) {
  const s = { ...state, cards: [...state.cards] }
  const events = []
  // MP が0を下回っても、その攻撃(行動)は最後まで処理し、行動の区切りで終わりを確かめる
  const ended = () => s.playerMp < 0 || s.dealerMp < 0
  const push = (e) => events.push(e)
  const buff = () => (s.cards.some(Boolean) ? handBuff(s.declared) : handBuff('high'))

  const pay = (who, amount, why) => {
    if (who === 'player') s.playerMp -= amount
    else s.dealerMp -= amount
    push({ t: 'cost', who, amount, why, mp: who === 'player' ? s.playerMp : s.dealerMp })
  }
  const attackCost = (who) => {
    const c = who === 'player' ? settings.playerAttackCost : settings.dealerAttackCost
    pay(who, total(roll(c.count, c.sides)), '攻撃')
  }

  const declare = (reason) => {
    s.declared = declareHand(s.cards, settings.bluffRate, s.history ?? undefined)
    push({ t: 'declare', hand: s.declared, reason })
  }

  // 札配り(The Flop): MP 7d4-4 を使い、7枚を引いて宣言する
  const flop = () => {
    pay('dealer', Math.max(0, total(roll(7, 4)) - 4), '札配り')
    s.cards = fillEmpty(Array(SLOTS).fill(null)).cards
    push({ t: 'flop', public: s.cards.slice(0, PUBLIC_SLOTS) })
    declare('flop')
  }

  // ダメージを与える: raw に軽減率と装甲をかけて MP を減らす
  const hit = (target, raw, reduce, armor, info) => {
    const damage = Math.max(0, Math.round(raw * (1 - reduce)) - armor)
    if (target === 'player') s.playerMp -= damage
    else s.dealerMp -= damage
    push({ t: 'hit', target, raw, reduce: Math.round(reduce * 100), armor, damage, mp: target === 'player' ? s.playerMp : s.dealerMp, ...info })
  }

  // プレイヤーの攻撃の判定とダメージのダイス(失敗なら null)
  const playerAttack = (kind) => {
    const r = skillRoll(settings.skill)
    push({ t: 'roll', who: 'player', skill: '攻撃', kind, ...r })
    if (!r.level) {
      push({ t: 'miss', who: 'player', kind })
      return null
    }
    const dice = roll(settings.playerDice.count, settings.playerDice.sides)
    return { level: r.level, dice, raw: total(dice) }
  }

  // ディーラーが攻撃を受ける(回避の判定とバフ・装甲)
  // levels: 軽減に使う成功強度の並び。勝負では《Showdown》の成功強度で軽減したあと、回避でさらに軽減する(重ねがけ)
  const dealerTakes = (atk, kind, { levels = null } = {}) => {
    const b = buff()
    let list = levels
    if (list === null) {
      const d = skillRoll(settings.skill, { straight: b.straight })
      push({ t: 'roll', who: 'dealer', skill: '回避', kind, ...d })
      list = [d.level]
    }
    const rates = list.map((lv) => Math.min(1, mitigation(lv, atk.level) + b.dodgeBonus))
    const reduce = 1 - rates.reduce((left, r) => left * (1 - r), 1)
    hit('dealer', atk.raw, reduce, b.armor, { kind, dice: atk.dice, reduces: rates.map((r) => Math.round(r * 100)) })
  }

  // プレイヤーが攻撃を受ける(フォーカードの効果があれば回避できない)
  const playerTakes = (raw, atkLevel, kind, dice) => {
    let reduce = 0
    if (handBuff(s.declared).unavoidable && s.cards.some(Boolean)) {
      push({ t: 'note', text: '回避できない(フォーカードの効果)' })
    } else {
      const d = skillRoll(settings.skill)
      push({ t: 'roll', who: 'player', skill: '回避', kind, ...d })
      reduce = mitigation(d.level, atkLevel)
    }
    hit('player', raw, reduce, 0, { kind, dice })
  }

  // --- プレイヤーの行動 ---
  const playerCheck = () => {
    push({ t: 'action', who: 'player', action: 'check' })
    attackCost('player')
    const atk = playerAttack('通常攻撃')
    if (atk) dealerTakes(atk, '通常攻撃')
  }

  const playerRaise = (slot) => {
    push({ t: 'action', who: 'player', action: 'raise', slot })
    attackCost('player')
    const atk = playerAttack('Raise')
    if (!atk) return
    // 札は回避できない。ダメージ13ごとに1枚破れる(選んだ札から、残っている公開札へ順に)
    const order = [slot, ...Array.from({ length: PUBLIC_SLOTS }, (_, i) => i).filter((i) => i !== slot)].filter((i) => s.cards[i])
    const broken = order.slice(0, Math.floor(atk.raw / CARD_DURABILITY))
    push({ t: 'card_hit', dice: atk.dice, raw: atk.raw, broken })
    if (!broken.length) return
    for (const i of broken) s.cards[i] = null
    push({ t: 'tear', by: 'player', slots: broken })
    declare('raise')
  }

  // 勝負(Showdown)
  const showdown = () => {
    push({ t: 'action', who: 'player', action: 'call' })
    attackCost('player')
    push({ t: 'reveal', hidden: s.cards.slice(PUBLIC_SLOTS) })
    // 嘘かどうかは、空札を引き直す前の札で確かめる
    const check = bestHand(s.cards)
    const bluff = check.rank < handRank(s.declared)
    push({ t: 'check', declared: s.declared, actual: check.key, bluff, cards: check.roleCards })
    // 空札を引き直す(1枚につき MP 1d8)
    const empty = s.cards.map((c, i) => (c ? null : i)).filter((i) => i !== null)
    if (empty.length) {
      pay('dealer', total(roll(empty.length, 8)), '引き直し')
      const r = fillEmpty(s.cards)
      s.cards = r.cards
      push({ t: 'redraw', slots: r.filled, cards: Object.fromEntries(r.filled.map((i) => [i, s.cards[i]])) })
    }
    const final = bestHand(s.cards)
    push({ t: 'final', hand: final.key, cards: final.roleCards })

    const atk = playerAttack('勝負')
    if (bluff) {
      // 嘘が見破られた: 役の効果とダメージはなく、ディーラーは回避せずに受ける
      if (atk) hit('dealer', atk.raw, 0, 0, { kind: '勝負', dice: atk.dice })
    } else {
      // 宣言どおり: 《Showdown》の成功強度で軽減し、さらに回避で軽減(重ねがけ)してから、宣言した役の 倍率d13 で反撃する
      const b = buff()
      const sd = skillRoll(settings.skill, { straight: b.straight })
      push({ t: 'roll', who: 'dealer', skill: '《Showdown》', kind: '勝負', ...sd })
      if (atk) {
        const d = skillRoll(settings.skill, { straight: b.straight })
        push({ t: 'roll', who: 'dealer', skill: '回避', kind: '勝負', ...d })
        dealerTakes(atk, '勝負', { levels: [sd.level, d.level] })
      }
      if (!sd.level) {
        push({ t: 'miss', who: 'dealer', kind: '反撃' })
      } else {
        const dice = roll(b.mult, 13)
        playerTakes(total(dice), sd.level, '反撃', dice)
      }
    }
    if (ended()) return
    // 結果に関わらず場の札を捨てる
    s.cards = Array(SLOTS).fill(null)
    push({ t: 'discard' })
  }

  // --- ディーラーのターン ---
  const dealerTurn = () => {
    push({ t: 'turn', who: 'dealer' })
    // 勝負のあとは札を配り直す(このターンはそれで終わり)
    if (!s.cards.some(Boolean)) {
      flop()
      return
    }
    const hand = bestHand(s.cards)
    // 破る意味のある札: 役に使っていない公開札のうち一番弱いもの(ディーラーは伏せ札を破れない)
    const candidates = s.cards
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => i < PUBLIC_SLOTS && c && c !== 'JK' && !hand.roleCards.includes(c))
      .sort((a, b) => Number(a.c.slice(1)) - Number(b.c.slice(1)))
    if (candidates.length && randInt(100) < settings.dealerRaiseRate) {
      push({ t: 'action', who: 'dealer', action: 'raise' })
      attackCost('dealer')
      const slot = candidates[0].i
      s.cards[slot] = null
      push({ t: 'tear', by: 'dealer', slots: [slot] })
      declare('raise')
    } else {
      push({ t: 'action', who: 'dealer', action: 'check' })
      attackCost('dealer')
      const b = buff()
      const r = skillRoll(settings.skill, { straight: b.straight })
      push({ t: 'roll', who: 'dealer', skill: '攻撃', kind: '通常攻撃', ...r })
      if (!r.level) {
        push({ t: 'miss', who: 'dealer', kind: '通常攻撃' })
      } else {
        const dice = roll(settings.dealerDice.count, settings.dealerDice.sides)
        const bonusDice = roll(b.mult, 13)
        const raw = total(dice) + Math.floor(total(bonusDice) / 2)
        playerTakes(raw, r.level, '通常攻撃', [...dice, ...(bonusDice.length ? [`+${Math.floor(total(bonusDice) / 2)}`] : [])])
      }
    }
    if (ended()) return
    // ターン終了時: 破れた札を引き直す(The River。1枚につき MP 1d8)
    const empty = s.cards.map((c, i) => (c ? null : i)).filter((i) => i !== null)
    if (empty.length && randInt(100) < settings.riverRate) {
      pay('dealer', total(roll(empty.length, 8)), '引き直し')
      const r = fillEmpty(s.cards)
      s.cards = r.cards
      // 伏せ札の枠に引いた札は見せない
      push({ t: 'river', slots: r.filled, public: Object.fromEntries(r.filled.filter((i) => i < PUBLIC_SLOTS).map((i) => [i, s.cards[i]])) })
      if (ended()) return
      declare('river')
    }
  }

  return { s, events, ended, flop, playerCheck, playerRaise, showdown, dealerTurn, push }
}

// 新しい勝負: ディーラーが札を配って宣言する
export function startGame(settings) {
  const run = createRun({ cards: Array(SLOTS).fill(null), declared: 'high', playerMp: settings.playerMp, dealerMp: settings.dealerMp }, settings)
  run.push({ t: 'turn', who: 'dealer' })
  run.flop()
  if (!run.ended()) run.push({ t: 'turn', who: 'player' })
  return { state: run.s, events: run.events, ended: run.ended() }
}

// プレイヤーの行動と、それに続くディーラーのターン
export function playTurn(state, action, slot, settings) {
  const run = createRun(state, settings)
  if (action === 'call') run.showdown()
  else if (action === 'raise') run.playerRaise(slot)
  else run.playerCheck()
  if (!run.ended()) run.dealerTurn()
  if (!run.ended()) run.push({ t: 'turn', who: 'player' })
  return { state: run.s, events: run.events, ended: run.ended() }
}

// 精算額: (プレイヤーのMP - ディーラーのMP) × レート
export const settlement = (playerMp, dealerMp, rate) => (playerMp - dealerMp) * rate

export function countShowdownToday(db, pcId) {
  return db
    .prepare('SELECT COUNT(*) AS c FROM showdown_games WHERE pc_id = ? AND created_at >= ?')
    .bind(pcId, todayStartUtc())
}

// 画面に返す形(勝負中は伏せ札を見せない)
export function publicGame(row) {
  if (!row) return null
  const cards = JSON.parse(row.cards)
  const done = row.status !== 'playing'
  return {
    id: row.id,
    pcId: row.pc_id,
    status: row.status,
    declared: row.declared,
    buff: cards.some(Boolean) ? handBuff(row.declared) : null,
    publicCards: cards.slice(0, PUBLIC_SLOTS),
    hiddenCards: done ? cards.slice(PUBLIC_SLOTS) : null,
    hiddenPresent: cards.slice(PUBLIC_SLOTS).map(Boolean), // 伏せ札の枠に札があるか(破れた枠は false)
    playerMp: row.player_mp,
    dealerMp: row.dealer_mp,
    result: done && row.result ? JSON.parse(row.result) : null,
    net: row.net,
    dealerPcId: row.dealer_pc_id,
    dealerDelta: row.dealer_delta,
    createdAt: row.created_at,
  }
}


// MP で戦う形にする前の、進行中の勝負(player_mp が空)は、払った掛金と料金を戻して閉じる
export function closeLegacyGames(db, pcId) {
  return [
    db.prepare(
      `UPDATE pcs SET money = money - COALESCE((SELECT SUM(net) FROM showdown_games WHERE pc_id = ?1 AND status = 'playing' AND player_mp IS NULL), 0)
       WHERE id = ?1`
    ).bind(pcId),
    db.prepare(
      `UPDATE showdown_games SET status = 'fold', net = 0, finished_at = datetime('now')
       WHERE pc_id = ? AND status = 'playing' AND player_mp IS NULL`
    ).bind(pcId),
  ]
}
