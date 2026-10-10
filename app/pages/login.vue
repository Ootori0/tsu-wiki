<script setup>
const { fetchUser } = useAuth()

const name = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const login = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { name: name.value, password: password.value },
    })
    await fetchUser()
    await navigateTo('/')
  } catch (e) {
    error.value = 'IDまたはパスワードが違います'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="login-box">
      <h1 class="login-title">ログイン</h1>

      <form class="login-form" @submit.prevent="login">
        <label class="login-label">ID</label>
        <input v-model="name" type="text" class="login-input" autocomplete="username" />

        <label class="login-label">パスワード</label>
        <input v-model="password" type="password" class="login-input" autocomplete="current-password" />

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
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