import { requirePcOwner } from '../../../utils/pcAccess'
import { loadMoneyLogs } from '../../../utils/moneyLogs'

// 所持金の増減履歴(手動・店の購入/売上・カジノ)をまとめて新しい順に返す
export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  const id = Number(getRouterParam(event, 'id'))
  await requirePcOwner(event, db, id)

  return loadMoneyLogs(db, { pcId: id, limit: 100 })
})
