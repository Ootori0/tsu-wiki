import { requirePlayablePc } from '../../../utils/showdownAccess'
import { loadShowdownSettings, declareHand, resolveShowdown, publicGame, PUBLIC_SLOTS } from '../../../utils/showdown'
import { dealerDeltaOf } from '../../../utils/chinchiro'

// 勝負中の操作: raise(公開札を1枚破る)/ fold(降りる = Check)/ call(勝負)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { gameId, action, slot } = (await readBody(event)) ?? {}

  const row = await db.prepare('SELECT * FROM showdown_games WHERE id = ?').bind(Number(gameId)).first()
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '勝負が見つかりません' })
  }
  const { pc } = await requirePlayablePc(event, db, row.pc_id)
  if (row.status !== 'playing') {
    throw createError({ statusCode: 409, statusMessage: 'この勝負はもう終わっています' })
  }

  const settings = await loadShowdownSettings(event, db)
  const cards = JSON.parse(row.cards)
  const isLedger = pc.money_mode === 'ledger'
  // 同時に別の操作をされていないこと(状態が読んだときのままであること)をバッチの最初に確かめる
  const unchanged = db
    .prepare("INSERT INTO balance_checks (money) SELECT CASE WHEN status = 'playing' AND cards = ? THEN 0 ELSE -1 END FROM showdown_games WHERE id = ?")
    .bind(row.cards, row.id)
  const run = async (statements) => {
    try {
      await db.batch([unchanged, ...statements])
    } catch {
      throw createError({ statusCode: 409, statusMessage: '所持金が足りないか、勝負の状態が変わりました。画面を読み込み直してください' })
    }
    const updated = await db.prepare('SELECT * FROM showdown_games WHERE id = ?').bind(row.id).first()
    return { game: publicGame(updated) }
  }

  if (action === 'raise') {
    const i = Number(slot)
    if (row.raises >= settings.raiseMax) {
      throw createError({ statusCode: 400, statusMessage: `Raise は${settings.raiseMax}回までです` })
    }
    if (!Number.isInteger(i) || i < 0 || i >= PUBLIC_SLOTS || !cards[i]) {
      throw createError({ statusCode: 400, statusMessage: '破れるのは残っている公開札だけです' })
    }
    const fee = Math.ceil((row.bet * settings.raiseFee) / 100)
    const next = cards.map((c, j) => (j === i ? null : c))
    // 札が破られたら、ディーラーは役を宣言し直す
    const declared = declareHand(next, settings.bluffRate)
    return run([
      ...(isLedger ? [] : [db.prepare('INSERT INTO balance_checks (money) SELECT money - ? FROM pcs WHERE id = ?').bind(fee, pc.id)]),
      db.prepare('DELETE FROM balance_checks'),
      db.prepare("UPDATE pcs SET money = money - ?, updated_at = datetime('now') WHERE id = ?").bind(fee, pc.id),
      db
        .prepare(
          `UPDATE showdown_games SET cards = ?, declared = ?, raises = raises + 1, raise_fee_total = raise_fee_total + ?, net = net - ?
           WHERE id = ?`
        )
        .bind(JSON.stringify(next), declared, fee, fee, row.id),
    ])
  }

  if (action !== 'fold' && action !== 'call') {
    throw createError({ statusCode: 400, statusMessage: '操作が不正です' })
  }

  // 決着: 降りたら掛金の半分、勝負したら結果に応じて払い戻す
  const outcome = action === 'fold'
    ? { status: 'fold', payout: Math.floor(row.bet / 2), hand: null, detail: { cards, declared: row.declared } }
    : resolveShowdown({ ...row, cards }, settings)
  const net = row.net + outcome.payout
  const dealerPcId = settings.dealerPcId && settings.dealerPcId !== pc.id ? settings.dealerPcId : null
  const dealerDelta = dealerPcId ? dealerDeltaOf(net, settings.dealerShare) : 0

  return run([
    db.prepare('DELETE FROM balance_checks'),
    db.prepare("UPDATE pcs SET money = money + ?, updated_at = datetime('now') WHERE id = ?").bind(outcome.payout, pc.id),
    ...(dealerPcId
      ? [db.prepare("UPDATE pcs SET money = money + ?, updated_at = datetime('now') WHERE id = ?").bind(dealerDelta, dealerPcId)]
      : []),
    db
      .prepare(
        `UPDATE showdown_games
         SET status = ?, hand = ?, result = ?, payout = ?, net = ?, cards = ?, dealer_pc_id = ?, dealer_delta = ?, finished_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        outcome.status, outcome.hand, JSON.stringify(outcome.detail), outcome.payout, net,
        JSON.stringify(outcome.detail.cards), dealerPcId, dealerDelta, row.id,
      ),
  ])
})
