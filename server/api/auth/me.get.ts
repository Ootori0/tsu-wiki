import { getSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')

  const user = await getSessionUser(db, sessionId ?? '')

  if (!user) {
    return null
  }

  return user
})