import { requirePcOwner } from '../../../utils/pcAccess'
import { invalidateCache } from '../../../utils/cache'
import { deleteImage } from '../../../utils/pcImage'

// PCの画像を外す
export default defineEventHandler(async (event) => {
  const { tsu_wiki_db: db, tsu_wiki_images: bucket } = event.context.cloudflare.env
  const id = Number(getRouterParam(event, 'id'))
  await requirePcOwner(event, db, id)

  const old = await db.prepare('SELECT image_url FROM pcs WHERE id = ?').bind(id).first()
  await db.prepare("UPDATE pcs SET image_url = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run()
  await deleteImage(bucket, old?.image_url)

  invalidateCache('pcs')
  return { success: true }
})
