import { requirePcOwner } from '../../../utils/pcAccess'

// 所持金の手動での増減(履歴に残す)
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const { currentUser, pc } = await requirePcOwner(event, db, id)

  const { amount, reason } = (await readBody(event)) ?? {}
  const amountNum = Number(amount)
  if (!Number.isInteger(amountNum) || amountNum === 0) {
    throw createError({ statusCode: 400, statusMessage: '増減額は0以外の整数で指定してください' })
  }
  const reasonText = String(reason ?? '').trim()
  if (!reasonText) {
    throw createError({ statusCode: 400, statusMessage: '理由を入力してください' })
  }

  await db.batch([
    db
      .prepare('UPDATE pcs SET money = money + ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(amountNum, pc.id),
    db
      .prepare(
        `INSERT INTO money_logs (pc_id, amount, balance_after, reason, created_by)
         VALUES (?, ?, (SELECT money FROM pcs WHERE id = ?), ?, ?)`
      )
      .bind(pc.id, amountNum, pc.id, reasonText, currentUser.id),
  ])

  const updated = await db.prepare('SELECT money FROM pcs WHERE id = ?').bind(pc.id).first()
  return { success: true, money: updated.money }
})
