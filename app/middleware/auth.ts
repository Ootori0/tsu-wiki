export default defineNuxtRouteMiddleware(async () => {
  const user = await useAuth().loadUserForRoute()

  if (!user) {
    return navigateTo('/login')
  }
})
