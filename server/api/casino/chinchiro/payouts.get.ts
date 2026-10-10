import { loadPayouts, loadDealer, BET_UNIT } from '../../../utils/chinchiro'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  return {
    payouts: await loadPayouts(db),
    dealer: await loadDealer(db),
    betUnit: BET_UNIT,
  }
})
