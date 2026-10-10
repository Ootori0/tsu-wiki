import { formatPc } from '../utils/pc'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db

  const { results } = await db
    .prepare('SELECT * FROM pcs ORDER BY affiliation ASC, grade ASC, name ASC')
    .all()

  // 所持金は本人(マイページ・店)でのみ扱うため公開一覧には含めない
  return results.map((r) => {
    const { money, ...pc } = formatPc(r)
    return pc
  })
})
