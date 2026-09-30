export default defineNuxtRouteMiddleware(async () => {
  const { user } = useAuth()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  try {
    const currentUser = await $fetch('/api/auth/me', { headers })
    user.value = currentUser
  } catch {
    user.value = null
  }

  const isAdmin = user.value?.permissions?.includes('admin')

  if (!isAdmin) {
    return navigateTo('/login')
  }
})