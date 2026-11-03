import { getSessionUser } from '../../utils/session'
import { formatPc } from '../../utils/pc'
import { formatPcItem } from '../../utils/pcItems'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const [{ results }, { results: items }] = await db.batch([
    db.prepare('SELECT * FROM pcs WHERE created_by = ? ORDER BY id DESC').bind(currentUser.id),
    // 所持品も一緒に返す
    db.prepare(
      'SELECT pc_items.* FROM pc_items JOIN pcs ON pcs.id = pc_items.pc_id WHERE pcs.created_by = ? ORDER BY pc_items.id ASC'
    ).bind(currentUser.id),
  ])

  return results.map((pc) => ({
    ...formatPc(pc),
    pcItems: items.filter((i) => i.pc_id === pc.id).map(formatPcItem),
  }))
})
