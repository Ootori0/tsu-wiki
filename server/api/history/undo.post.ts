import { getSessionUser } from '../../utils/session'
import { invalidateCache } from '../../utils/cache'
import { HISTORY_TARGETS } from '../../utils/historyReverse'

// 直前の操作の取り消し(購入・所持金の手動の増減)
// 取り消せるのは、自分が操作したもので、10分以内で、そのPCの一番新しい記録だけ
const UNDO_MINUTES = 10

const UNDOABLE = {
  purchase: {
    find: (db, id) => db.prepare('SELECT id, pc_id, purchased_by AS user_id, created_at FROM purchases WHERE id = ?').bind(id).first(),
    latestId: (db, pcId) => db.prepare('SELECT MAX(id) AS id FROM purchases WHERE pc_id = ?').bind(pcId).first(),
  },
  manual: {
    find: (db, id) => db.prepare("SELECT id, pc_id, created_by AS user_id, created_at FROM money_logs WHERE id = ? AND type = 'manual'").bind(id).first(),
    latestId: (db, pcId) => db.prepare('SELECT MAX(id) AS id FROM money_logs WHERE pc_id = ?').bind(pcId).first(),
  },
}

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const { kind, id } = (await readBody(event)) ?? {}
  const rule = UNDOABLE[kind]
  const idNum = Number(id)
  if (!rule || !Number.isInteger(idNum)) {
    throw createError({ statusCode: 400, statusMessage: '取り消す操作が不正です' })
  }

  const row = await rule.find(db, idNum)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'すでに取り消されたか、見つかりません' })
  }
  if (row.user_id !== currentUser.id) {
    throw createError({ statusCode: 403, statusMessage: '自分の操作だけ取り消せます' })
  }
  const elapsed = Date.now() - new Date(`${row.created_at.replace(' ', 'T')}Z`).getTime()
  if (elapsed > UNDO_MINUTES * 60_000) {
    throw createError({ statusCode: 409, statusMessage: `取り消せるのは${UNDO_MINUTES}分以内の操作だけです` })
  }
  const latest = await rule.latestId(db, row.pc_id)
  if (latest?.id !== row.id) {
    throw createError({ statusCode: 409, statusMessage: 'このあとに別の操作があるため取り消せません' })
  }

  await db.batch(HISTORY_TARGETS[kind].statements(db, idNum))
  invalidateCache('shop:items')

  const pc = await db.prepare('SELECT money FROM pcs WHERE id = ?').bind(row.pc_id).first()
  return { success: true, money: pc?.money ?? null }
})
