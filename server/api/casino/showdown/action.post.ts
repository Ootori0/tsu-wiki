import { requirePlayablePc } from '../../../utils/showdownAccess'
import { loadShowdownSettings, playTurn, settlement, publicGame, PUBLIC_SLOTS } from '../../../utils/showdown'
import { dealerDeltaOf } from '../../../utils/chinchiro'

const MAX_LOG = 400

// プレイヤーの行動: call(勝負)/ raise(公開札を攻撃)/ check(通常攻撃)/ resign(投了)
// 行動のあと、ディーラーのターンまで進めて、起きたこと(events)を返す
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { gameId, action, slot } = (await readBody(event)) ?? {}

  const row = await db.prepare('SELECT * FROM showdown_games WHERE id = ?').bind(Number(gameId)).first()
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '勝負が見つかりません' })
  }
  const { pc } = await requirePlayablePc(event, db, row.pc_id)
  if (row.status !== 'playing' || row.player_mp === null) {
    throw createError({ statusCode: 409, statusMessage: 'この勝負はもう終わっています' })
  }
  if (!['call', 'raise', 'check', 'resign'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: '操作が不正です' })
  }

  const settings = await loadShowdownSettings(event, db)
  const cards = JSON.parse(row.cards)
  const state = { cards, declared: row.declared, playerMp: row.player_mp, dealerMp: row.dealer_mp }

  let next = state
  let events = []
  let ended = false
  if (action === 'resign') {
    // 投了: 自分の MP を0として精算する
    next = { ...state, playerMp: 0 }
    events = [{ t: 'resign' }]
    ended = true
  } else {
    if (action === 'raise') {
      const i = Number(slot)
      if (!Number.isInteger(i) || i < 0 || i >= PUBLIC_SLOTS || !cards[i]) {
        throw createError({ statusCode: 400, statusMessage: '攻撃できるのは残っている公開札だけです' })
      }
    }
    ;({ state: next, events, ended } = playTurn(state, action, Number(slot), settings))
  }

  const log = [...JSON.parse(row.log ?? '[]'), ...events].slice(-MAX_LOG)
  // 同時に別の操作をされていないこと(状態が読んだときのままであること)をバッチの最初に確かめる
  const unchanged = db
    .prepare(
      `INSERT INTO balance_checks (money)
       SELECT CASE WHEN status = 'playing' AND cards = ? AND player_mp = ? AND dealer_mp = ? THEN 0 ELSE -1 END
       FROM showdown_games WHERE id = ?`
    )
    .bind(row.cards, row.player_mp, row.dealer_mp, row.id)

  const statements = [unchanged, db.prepare('DELETE FROM balance_checks')]
  if (ended) {
    events.push({ t: 'end', playerMp: next.playerMp, dealerMp: next.dealerMp })
    const net = settlement(next.playerMp, next.dealerMp, settings.rate)
    const status = action === 'resign' ? 'fold' : net > 0 ? 'win' : net < 0 ? 'lose' : 'push'
    const dealerPcId = settings.dealerPcId && settings.dealerPcId !== pc.id ? settings.dealerPcId : null
    const dealerDelta = dealerPcId ? dealerDeltaOf(net, settings.dealerShare) : 0
    statements.push(
      db.prepare("UPDATE pcs SET money = money + ?, updated_at = datetime('now') WHERE id = ?").bind(net, pc.id),
      ...(dealerPcId
        ? [db.prepare("UPDATE pcs SET money = money + ?, updated_at = datetime('now') WHERE id = ?").bind(dealerDelta, dealerPcId)]
        : []),
      db
        .prepare(
          `UPDATE showdown_games
           SET status = ?, cards = ?, declared = ?, player_mp = ?, dealer_mp = ?, log = ?, net = ?, payout = ?,
               result = ?, dealer_pc_id = ?, dealer_delta = ?, finished_at = datetime('now')
           WHERE id = ?`
        )
        .bind(
          status, JSON.stringify(next.cards), next.declared, next.playerMp, next.dealerMp, JSON.stringify([...log, events.at(-1)]), net, net,
          JSON.stringify({ playerMp: next.playerMp, dealerMp: next.dealerMp, rate: settings.rate, resigned: action === 'resign' }),
          dealerPcId, dealerDelta, row.id,
        ),
    )
  } else {
    statements.push(
      db
        .prepare('UPDATE showdown_games SET cards = ?, declared = ?, player_mp = ?, dealer_mp = ?, log = ? WHERE id = ?')
        .bind(JSON.stringify(next.cards), next.declared, next.playerMp, next.dealerMp, JSON.stringify(log), row.id),
    )
  }

  try {
    await db.batch(statements)
  } catch {
    throw createError({ statusCode: 409, statusMessage: '勝負の状態が変わりました。画面を読み込み直してください' })
  }
  const updated = await db.prepare('SELECT * FROM showdown_games WHERE id = ?').bind(row.id).first()
  return { game: publicGame(updated), events }
})
