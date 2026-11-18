import { getSessionUser } from '../../../utils/session'
import { isManager } from '../../../utils/permission'
import { loadShowdownSettings } from '../../../utils/showdown'

// 管理画面用: Showdown の設定(嘘の確率も含む)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }
  return loadShowdownSettings(event, db)
})
