import { loadPayouts, loadDealer, BET_UNIT } from '../../../utils/chinchiro'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db
  return {
    payouts: await loadPayouts(event, db),
    dealer: await loadDealer(event, db),
    betUnit: BET_UNIT,
  }
})
