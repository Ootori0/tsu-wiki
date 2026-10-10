export default defineNuxtRouteMiddleware(async () => {
  const { user, checked } = useAuth()

  if (import.meta.server) {
    // サーバー描画時は毎回 Cookie で確認する
    try {
      user.value = await $fetch('/api/auth/me', { headers: useRequestHeaders(['cookie']) })
    } catch {
      user.value = null
    }
    checked.value = true
  } else if (!checked.value) {
    try {
      user.value = await $fetch('/api/auth/me')
    } catch {
      user.value = null
    }
    checked.value = true
  }

  const isAdmin = user.value?.permissions?.includes('admin')

  if (!isAdmin) {
    return navigateTo('/login')
  }
})
