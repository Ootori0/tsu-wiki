import { getSessionUser } from '../../utils/session'
import { isAdmin } from '../../utils/permission'

// 販売者の金額は admin のみに返す
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const sessionId = getCookie(event, 'session_id')
  const currentUser = await getSessionUser(db, sessionId ?? '')
  const admin = isAdmin(currentUser?.permissions)

  const [{ results: items }, { results: sellers }] = await db.batch([
    db.prepare('SELECT * FROM shop_items ORDER BY shop ASC, sort_order ASC, id ASC'),
    db.prepare(
      `SELECT s.item_id, s.pc_id, s.amount, pcs.name AS pc_name
       FROM shop_item_sellers s JOIN pcs ON pcs.id = s.pc_id
       ORDER BY s.id ASC`
    ),
  ])

  return items.map((item) => ({
    ...item,
    sellers: sellers
      .filter((s) => s.item_id === item.id)
      .map((s) => (admin
        ? { pcId: s.pc_id, pcName: s.pc_name, amount: s.amount }
        : { pcId: s.pc_id, pcName: s.pc_name })),
  }))
})
