export default defineNuxtRouteMiddleware(async () => {
  const { user } = useAuth()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  try {
    const currentUser = await $fetch('/api/auth/me', { headers })
    user.value = currentUser
  } catch {
    user.value = null
  }

  if (!user.value) {
    return navigateTo('/login')
  }
})