import { findUsableInvite } from '../../utils/invite'

// リンクがまだ使えるか(ページを開いたときに確かめる)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const { token } = getQuery(event)
  const invite = await findUsableInvite(db, String(token ?? ''))
  return invite ? { usable: true, expiresAt: invite.expires_at } : { usable: false }
})
