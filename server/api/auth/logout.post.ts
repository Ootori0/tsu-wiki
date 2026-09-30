import { deleteSession } from '../../utils/session'

// 以下は変更なし

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')

  if (sessionId) {
    await deleteSession(db, sessionId)
  }

  deleteCookie(event, 'session_id', { path: '/' })

  return { success: true }
})