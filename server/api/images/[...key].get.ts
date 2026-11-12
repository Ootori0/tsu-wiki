// R2 の画像を配信する(キーは毎回変わるので長くキャッシュしてよい)
export default defineEventHandler(async (event) => {
  const bucket = event.context.cloudflare.env.tsu_wiki_images
  const key = getRouterParam(event, 'key')
  if (!key || !key.startsWith('pcs/')) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  const obj = await bucket.get(key)
  if (!obj) {
    throw createError({ statusCode: 404, statusMessage: 'not found' })
  }

  setResponseHeaders(event, {
    'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  return obj.body
})
