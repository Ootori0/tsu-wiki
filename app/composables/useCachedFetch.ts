export function useCachedFetch(url, options = {}) {
  const nuxtApp = useNuxtApp()
  return useFetch(url, {
    ...options,
    getCachedData(key, _nuxtApp, ctx) {
      // refresh() 時はキャッシュを使わずDBから再取得する
      if (ctx?.cause === 'refresh:manual' || ctx?.cause === 'refresh:hook') return undefined
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    },
  })
}
