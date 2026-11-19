import { getSessionUser } from '../../utils/session'
import { isManager } from '../../utils/permission'
import { loadMoneyLogs } from '../../utils/moneyLogs'

// 全PCの所持金の増減履歴(手動・店の購入/売上・カジノ・ディーラー)。pcId を指定するとそのPCだけ
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }

  const query = getQuery(event)
  const pcId = query.pcId ? Number(query.pcId) : null
  // 種別での絞り込みは決まった値だけを使う(server/utils/moneyLogs.ts)
  return loadMoneyLogs(db, { pcId, category: String(query.category ?? ''), limit: 200 })
})
