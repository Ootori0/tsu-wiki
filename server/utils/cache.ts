// Worker のインスタンス(isolate)ごとのメモリキャッシュ
// 更新APIでは同じインスタンスのキャッシュを即時に破棄する。他のインスタンスには最大 CACHE_TTL 遅れて反映される
export const CACHE_TTL = 60_000

const store = new Map<string, { expires: number, value: Promise<unknown> }>()

export function cached<T>(key: string, loader: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>

  // 同時に来たリクエストは同じ読み出しを共有する。失敗したらキャッシュしない
  const value = loader().catch((e) => {
    store.delete(key)
    throw e
  })
  store.set(key, { expires: now + ttl, value })
  return value
}

export function invalidateCache(...keys: string[]) {
  for (const key of keys) store.delete(key)
}
