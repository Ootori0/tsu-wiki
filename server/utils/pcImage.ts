// PCの画像(R2)。image_url には配信用のパス(/api/images/<key>)を入れる
export const IMAGE_PREFIX = '/api/images/'
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
}

// image_url から R2 のキーを取り出す(このサイトで登録した画像でなければ null)
export function imageKeyOf(url) {
  return typeof url === 'string' && url.startsWith(IMAGE_PREFIX) ? url.slice(IMAGE_PREFIX.length) : null
}

// 古い画像を消す(失敗してもPCの操作は止めない)
export async function deleteImage(bucket, url) {
  const key = imageKeyOf(url)
  if (!key) return
  try {
    await bucket.delete(key)
  } catch (e) {
    console.error('画像の削除に失敗しました', key, e)
  }
}
