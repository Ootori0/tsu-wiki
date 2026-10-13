import { requirePcOwner } from '../../../utils/pcAccess'

// 出納帳の清算: ココフォリア側に反映した後、未清算の合計を0に戻す
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  const { currentUser, pc } = await requirePcOwner(event, db, id)

  if (pc.money_mode !== 'ledger') {
    throw createError({ statusCode: 400, statusMessage: '出納帳のPCではありません' })
  }

  // 読み出し後に増減があっても、その時点の残高をまとめて0にする
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO money_logs (pc_id, amount, balance_after, reason, type, created_by)
         SELECT id, -money, 0, '清算(ココフォリアに反映)', 'settle', ? FROM pcs WHERE id = ? AND money != 0`
      )
      .bind(currentUser.id, pc.id),
    db.prepare('UPDATE pcs SET money = 0, updated_at = datetime(\'now\') WHERE id = ?').bind(pc.id),
  ])
  if (!results[0].meta.changes) {
    throw createError({ statusCode: 400, statusMessage: '清算する金額がありません' })
  }

  return { success: true }
})
