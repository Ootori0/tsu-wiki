import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'
import { parsePcBody } from '../../utils/pc'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')

  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }

  const id = getRouterParam(event, 'id')

  const existing = await db.prepare('SELECT * FROM pcs WHERE id = ?').bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  const isOwner = existing.created_by === currentUser.id
  if (!isOwner && !isAdmin(currentUser.permissions)) {
    throw createError({ statusCode: 403, statusMessage: '編集権限がありません' })
  }

  const pc = parsePcBody(await readBody(event))

  await db
    .prepare(
      `UPDATE pcs
       SET name = ?, affiliation = ?, office = ?, grade = ?, memo = ?, is_representative = ?, is_office_representative = ?,
           show_title = ?, show_office = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(pc.name, pc.affiliation, pc.office, pc.grade, pc.memo, pc.isRepresentative, pc.isOfficeRepresentative, pc.showTitle, pc.showOffice, id)
    .run()

  return { id: Number(id), success: true }
})
