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

  const [result] = await db.batch([
    db
      .prepare(
        `INSERT INTO pcs (created_by, name, affiliation, office, grade, memo,
          is_representative, is_office_representative, show_title, show_office, money)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(currentUser.id, pc.name, pc.affiliation, pc.office, pc.grade, pc.memo, pc.isRepresentative, pc.isOfficeRepresentative, pc.showTitle, pc.showOffice, pc.money),
    // 初期所持金も履歴に残す
    ...(pc.money !== 0
      ? [
          db
            .prepare(
              `INSERT INTO money_logs (pc_id, amount, balance_after, reason, created_by)
               VALUES ((SELECT MAX(id) FROM pcs), ?, ?, '初期所持金', ?)`
            )
            .bind(pc.money, pc.money, currentUser.id),
        ]
      : []),
  ])

  return { id: result.meta.last_row_id, success: true }
})
