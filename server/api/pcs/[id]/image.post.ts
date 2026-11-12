import { requirePcOwner } from '../../../utils/pcAccess'
import { invalidateCache } from '../../../utils/cache'
import { IMAGE_PREFIX, IMAGE_TYPES, MAX_IMAGE_BYTES, deleteImage } from '../../../utils/pcImage'

// PCの画像を登録・差し替える(multipart の image)。古い画像は消す
export default defineEventHandler(async (event) => {
  const { tsu_wiki_db: db, tsu_wiki_images: bucket } = event.context.cloudflare.env
  const id = Number(getRouterParam(event, 'id'))
  await requirePcOwner(event, db, id)

  const file = (await readMultipartFormData(event))?.find((f) => f.name === 'image')
  const ext = file && IMAGE_TYPES[file.type]
  if (!file || !ext) {
    throw createError({ statusCode: 400, statusMessage: '画像(WebP・JPEG・PNG・GIF)を選んでください' })
  }
  if (file.data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: '画像は2MBまでです' })
  }

  // キーは毎回変える(同じURLだとブラウザのキャッシュで古い画像が出るため)
  const key = `pcs/${id}/${crypto.randomUUID()}.${ext}`
  await bucket.put(key, file.data, { httpMetadata: { contentType: file.type } })

  const old = await db.prepare('SELECT image_url FROM pcs WHERE id = ?').bind(id).first()
  const url = `${IMAGE_PREFIX}${key}`
  await db.prepare("UPDATE pcs SET image_url = ?, updated_at = datetime('now') WHERE id = ?").bind(url, id).run()
  await deleteImage(bucket, old?.image_url)

  invalidateCache('pcs')
  return { success: true, imageUrl: url }
})
