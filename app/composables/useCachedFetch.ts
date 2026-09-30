export function useCachedFetch(url, options = {}) {
  const nuxtApp = useNuxtApp()
  return useFetch(url, {
    ...options,
    getCachedData(key) {
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
    },
  })
}