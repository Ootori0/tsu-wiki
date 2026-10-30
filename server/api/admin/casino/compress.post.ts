import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { compressCutoff } from '../../../utils/chinchiroCompress'

// チンチロの古い勝負記録を月計にまとめる(admin のみ)
// 所持金は変わらない。同じ月の月計がすでにあれば足し込む
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const cutoff = compressCutoff()
  const [{ results: [{ count }] }] = await db.batch([
    db.prepare('SELECT COUNT(*) AS count FROM chinchiro_games WHERE created_at < ?').bind(cutoff),
    // まとめて月計に入れてから元の記録を消す(同じトランザクションなので途中で失敗しても半端に残らない)
    db.prepare(
      `INSERT INTO chinchiro_monthly (pc_id, dealer_pc_id, month, plays, bet_total, net_total, dealer_delta_total, created_at)
       SELECT pc_id, COALESCE(dealer_pc_id, 0), strftime('%Y-%m', created_at, '+9 hours'),
              COUNT(*), SUM(bet), SUM(net), SUM(dealer_delta), MAX(created_at)
       FROM chinchiro_games
       WHERE created_at < ?1
       GROUP BY pc_id, COALESCE(dealer_pc_id, 0), strftime('%Y-%m', created_at, '+9 hours')
       ON CONFLICT (pc_id, dealer_pc_id, month) DO UPDATE SET
         plays = plays + excluded.plays,
         bet_total = bet_total + excluded.bet_total,
         net_total = net_total + excluded.net_total,
         dealer_delta_total = dealer_delta_total + excluded.dealer_delta_total,
         created_at = MAX(created_at, excluded.created_at)`
    ).bind(cutoff),
    db.prepare('DELETE FROM chinchiro_games WHERE created_at < ?').bind(cutoff),
  ])

  return { success: true, compressed: count }
})
