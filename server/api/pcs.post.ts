import { getSessionUser } from '../utils/session'
import { parsePcBody } from '../utils/pc'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const pc = parsePcBody(await readBody(event))

  const result = await db
    .prepare(
      `INSERT INTO pcs (created_by, name, affiliation, office, grade, memo,
        is_representative, is_office_representative, show_title, show_office)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(currentUser.id, pc.name, pc.affiliation, pc.office, pc.grade, pc.memo, pc.isRepresentative, pc.isOfficeRepresentative, pc.showTitle, pc.showOffice)
    .run()

  return { id: result.meta.last_row_id, success: true }
})
