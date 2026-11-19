import { getSessionUser } from '../../../utils/session'
import { isManager } from '../../../utils/permission'
import { saveShowdownSettings } from '../../../utils/showdown'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const currentUser = await getSessionUser(db, getCookie(event, 'session_id') ?? '')
  if (!currentUser || !isManager(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '管理権限(admin/KP)が必要です' })
  }
  return { success: true, settings: await saveShowdownSettings(db, await readBody(event)) }
})
