<script setup>
// 期限付きのアカウント作成リンク(/invite?t=トークン)
const route = useRoute()
const { user, fetchUser } = useAuth()
const token = computed(() => String(route.query.t ?? ''))

const { data: check, pending } = await useFetch('/api/invite/check', {
  query: { token },
  server: false,
})

const name = ref('')
const password = ref('')
const passwordAgain = ref('')
const error = ref('')
const loading = ref(false)

const formatExpires = (s) => {
  if (!s) return ''
  const d = new Date(`${s.replace(' ', 'T')}Z`)
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const register = async () => {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'パスワードは8文字以上にしてください'
    return
  }
  if (password.value !== passwordAgain.value) {
    error.value = 'パスワードが一致しません'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/invite/register', {
      method: 'POST',
      body: { token: token.value, name: name.value, password: password.value },
    })
    await fetchUser()
    clearNuxtData()
    await navigateTo('/mypage')
  } catch (e) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'アカウントを作成できませんでした'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="login-box">
      <h1 class="login-title">アカウント作成</h1>

      <p v-if="pending" class="login-note">リンクを確かめています...</p>
      <p v-else-if="!check?.usable" class="login-error">
        このリンクは期限切れか、すでに使われています。発行した人に新しいリンクをもらってください。
      </p>
      <form v-else class="login-form" @submit.prevent="register">
        <p class="login-note">このリンクの期限: {{ formatExpires(check.expiresAt) }}まで(1回だけ使えます)</p>
        <p v-if="user" class="login-note">いま {{ user.name }} でログインしています。作成すると新しいアカウントに切り替わります。</p>

        <label class="login-label">ID</label>
        <input v-model="name" type="text" class="login-input" maxlength="32" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" />

        <label class="login-label">パスワード(8文字以上)</label>
        <input v-model="password" type="password" class="login-input" autocomplete="new-password" />

        <label class="login-label">パスワード(確認)</label>
        <input v-model="passwordAgain" type="password" class="login-input" autocomplete="new-password" />

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="login-btn" :disabled="loading || !name.trim() || !password">
          {{ loading ? '作成中...' : '作成してログイン' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 72px 16px 48px;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.login-box {
  width: 100%;
  border: 2px solid var(--color-text, #000);
  border-left: 6px solid var(--color-accent, #ffd400);
  background: var(--color-bg, #fff);
  padding: 24px 20px;
  box-sizing: border-box;
}

.login-title {
  font-size: 1.3rem;
  margin: 0 0 20px;
  color: var(--color-text, #000);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-text, #000);
  margin-top: 8px;
}

.login-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-text, #000);
  padding: 10px;
  font-size: 16px;
  color: var(--color-text, #000);
  background: var(--color-bg, #fff);
}

.login-note {
  font-size: 0.8rem;
  margin: 0 0 4px;
  color: var(--color-text, #000);
  opacity: 0.75;
}

.login-error {
  color: #c00;
  font-size: 0.85rem;
  margin: 8px 0 0;
}

.login-btn {
  margin-top: 16px;
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: var(--color-text, #000);
  padding: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>