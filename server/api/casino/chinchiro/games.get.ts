import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { DAILY_PLAY_LIMIT, countPlaysTodayStatement } from '../../../utils/chinchiro'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { pcId } = getQuery(event)
  const pc = await db.prepare('SELECT created_by FROM pcs WHERE id = ?').bind(pcId).first()
  if (!pc) {
    throw createError({ statusCode: 404, statusMessage: 'PCが見つかりません' })
  }
  if (pc.created_by !== currentUser.id && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '閲覧権限がありません' })
  }

  // 自分が遊んだゲームと、ディーラーとして関わったゲーム
  // (OR でまとめるとインデックスが効かず全件読むので、それぞれ新しい順に20件読んでから合わせる)
  const LIMIT = 20
  const select = (role, col) =>
    db
      .prepare(
        `SELECT g.*, pcs.name AS player_name, '${role}' AS role
         FROM chinchiro_games g LEFT JOIN pcs ON pcs.id = g.pc_id
         WHERE g.${col} = ? ORDER BY g.created_at DESC, g.id DESC LIMIT ?`
      )
      .bind(pcId, LIMIT)
  const [{ results: played }, { results: dealt }, { results: [{ c: playsToday }] }] = await db.batch([
    select('player', 'pc_id'),
    select('dealer', 'dealer_pc_id'),
    countPlaysTodayStatement(db, pcId),
  ])
  const results = [...played, ...dealt].sort((a, b) => b.id - a.id).slice(0, LIMIT)

  return {
    games: results.map((r) => ({ ...r, rolls: JSON.parse(r.rolls) })),
    playsToday,
    dailyLimit: DAILY_PLAY_LIMIT,
  }
})
