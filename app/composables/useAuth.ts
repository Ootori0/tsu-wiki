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
    // 閲覧権限で中身が変わる一覧や自分のPCなど、読み込み済みのデータを捨てる(表示中のページを壊さないよう移動後に行う)
    clearNuxtData()
  }

  // ルートミドルウェア用: サーバー描画時は毎回 Cookie で確認し、ブラウザでは未確認のときだけ問い合わせる
  // サーバー側では素の $fetch だと Cloudflare の環境(D1)が API に渡らず未ログイン扱いになるため useRequestFetch を使う
  const loadUserForRoute = async () => {
    if (import.meta.server) {
      const requestFetch = useRequestFetch()
      try {
        user.value = await requestFetch('/api/auth/me')
      } catch {
        user.value = null
      }
      checked.value = true
    } else if (!checked.value) {
      await fetchUser()
    }
    return user.value
  }

  return { user, checked, fetchUser, ensureUser, loadUserForRoute, logout }
}
