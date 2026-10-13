export default defineNuxtRouteMiddleware(async () => {
  const user = await useAuth().loadUserForRoute()

  if (!user?.permissions?.includes('KP')) {
    return navigateTo('/login')
  }
})
