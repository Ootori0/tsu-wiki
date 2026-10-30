import { getSessionUser } from '../../../utils/session'
import { isAdmin } from '../../../utils/permission'
import { invalidateCache } from '../../../utils/cache'
import { HISTORY_TARGETS, deleteAllHistoryOfPc } from '../../../utils/historyReverse'

// 履歴の削除(admin のみ)。削除する履歴の所持金の増減を取り消してから記録を消す
// body: { kind, id } で1件、{ pcId, all: true } でそのPCの履歴をすべて
//   kind: manual/settle/mode … 所持金の手動増減など(money_logs)
//         purchase …… 購入(販売者への支払いも取り消し、在庫を戻す。割引で買ったものは割引の在庫へ)
//         sale ……… 販売者への支払い1件
//         casino/dealer … チンチロの勝負(プレイヤーとディーラーの両方の増減を取り消す)
//         casino_month/dealer_month … 圧縮したチンチロの月計(同上)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: 'admin権限が必要です' })
  }

  const body = await readBody(event)

  if (body?.all) {
    const pcId = Number(body.pcId)
    if (!Number.isInteger(pcId)) {
      throw createError({ statusCode: 400, statusMessage: 'PCを指定してください' })
    }
    await db.batch(deleteAllHistoryOfPc(db, pcId))
  } else {
    const id = Number(body?.id)
    if (!Number.isInteger(id)) {
      throw createError({ statusCode: 400, statusMessage: '履歴を指定してください' })
    }
    const target = HISTORY_TARGETS[body?.kind]
    if (!target) {
      throw createError({ statusCode: 400, statusMessage: '履歴の種類が不正です' })
    }
    const exists = await db.prepare(`SELECT id FROM ${target.table} WHERE id = ?`).bind(id).first()
    if (!exists) {
      throw createError({ statusCode: 404, statusMessage: '履歴が見つかりません(すでに削除された可能性があります)' })
    }
    await db.batch(target.statements(db, id))
  }

  // 在庫が戻ることがあるので商品一覧のキャッシュも破棄する
  invalidateCache('shop:items')

  return { success: true }
})
