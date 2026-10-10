export const useAuth = () => {
  const user = useState('auth-user', () => null)
  // このブラウザでログイン状態を確認済みか(確認済みならページ移動のたびに問い合わせない)
  const checked = useState('auth-checked', () => false)

  const fetchUser = async () => {
    try {
      user.value = await $fetch('/api/auth/me')
    } catch {
      user.value = null
    }
    checked.value = true
  }

  // 未確認のときだけ問い合わせる
  const ensureUser = async () => {
    if (!checked.value) await fetchUser()
    return user.value
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    checked.value = true
    await navigateTo('/')
  }

  return { user, checked, fetchUser, ensureUser, logout }
}
