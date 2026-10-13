import { requirePcOwner } from '../../../utils/pcAccess'

// 所持金 ⇔ 出納帳 の切替
// 出納帳へ: 未清算0から開始 / 所持金へ: 未清算が0のときだけ、入力した所持金から開始
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const { currentUser, pc } = await requirePcOwner(event, db, id)

  const { mode, money } = (await readBody(event)) ?? {}
  if (mode !== 'money' && mode !== 'ledger') {
    throw createError({ statusCode: 400, statusMessage: '切替先が不正です' })
  }
  if (pc.money_mode === mode) {
    throw createError({ statusCode: 400, statusMessage: '既にその方式です' })
  }

  if (mode === 'ledger') {
    await db.batch([
      db
        .prepare(
          `INSERT INTO money_logs (pc_id, amount, balance_after, reason, type, created_by)
           SELECT id, -money, 0, '出納帳に切替', 'mode', ? FROM pcs WHERE id = ?`
        )
        .bind(currentUser.id, pc.id),
      db
        .prepare("UPDATE pcs SET money_mode = 'ledger', money = 0, updated_at = datetime('now') WHERE id = ?")
        .bind(pc.id),
    ])
    return { success: true }
  }

  const moneyNum = Number(money ?? 0)
  if (!Number.isInteger(moneyNum)) {
    throw createError({ statusCode: 400, statusMessage: '所持金は整数で指定してください' })
  }

  // 未清算が残っていたら切り替えない(条件付き更新で同時操作にも対応)
  const result = await db
    .prepare("UPDATE pcs SET money_mode = 'money', money = ?, updated_at = datetime('now') WHERE id = ? AND money_mode = 'ledger' AND money = 0")
    .bind(moneyNum, pc.id)
    .run()
  if (!result.meta.changes) {
    throw createError({ statusCode: 409, statusMessage: '未清算の金額があります。先に清算してください' })
  }
  await db
    .prepare(
      `INSERT INTO money_logs (pc_id, amount, balance_after, reason, type, created_by)
       VALUES (?, ?, ?, '所持金に切替', 'mode', ?)`
    )
    .bind(pc.id, moneyNum, moneyNum, currentUser.id)
    .run()

  return { success: true }
})
