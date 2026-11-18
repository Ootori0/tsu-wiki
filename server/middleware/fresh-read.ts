import { CACHE_TTL } from '../utils/cache'

// 一覧のキャッシュ(server/utils/cache.ts)は Worker のインスタンスごとにあり、更新したインスタンスのものしか消せない。
// そのため、書き込んだ本人には一定時間 Cookie で印を付け、その間の読み込みはキャッシュを使わずDBから読ませる
// (他の人には最大 CACHE_TTL 遅れて反映されるのはこれまでどおり)
const COOKIE = 'recent_write'
const WINDOW_MS = CACHE_TTL + 5_000

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  if (event.method !== 'GET' && event.method !== 'HEAD') {
    setCookie(event, COOKIE, String(Date.now() + WINDOW_MS), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Math.ceil(WINDOW_MS / 1000),
      path: '/',
    })
    return
  }

  if (Number(getCookie(event, COOKIE)) > Date.now()) {
    event.context.freshRead = true
  }
})
