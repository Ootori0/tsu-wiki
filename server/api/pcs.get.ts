import { formatPc } from '../utils/pc'
import { cached } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.tsu_wiki_db

  const { results } = await cached('pcs', () =>
    db.prepare('SELECT * FROM pcs ORDER BY affiliation ASC, no_grade ASC, grade ASC, name ASC').all()
  )

  // 所持金は本人(マイページ・店)でのみ扱うため公開一覧には含めない。ステータスは公開にしたPCだけ出す
  return results.map((r) => {
    const { money, stats, ...pc } = formatPc(r)
    return pc.show_stats ? { ...pc, stats } : pc
  })
})
