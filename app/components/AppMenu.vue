<script setup>
const { user, fetchUser, logout } = useAuth()

onMounted(() => {
  fetchUser()
})

const drawer = ref(false)

const links = computed(() => [
  { to: '/', label: '表紙', icon: 'mdi-home' },
  { to: '/association', label: '協会(未完成)', icon: 'mdi-bank' },
  { to: '/pc', label: 'PC(未完成)', icon: 'mdi-account' },
  { to: '/magic', label: '魔法', icon: 'mdi-magic-staff' },
  { to: '/magic-guide', label: '魔法作成のすゝめ(未完成)', icon: 'mdi-book-open-variant' },
  { to: '/setting', label: '背景設定集', icon: 'mdi-book-open-page-variant' },
  { to: '/faq', label: 'よくある質問,裁定', icon: 'mdi-help-circle-outline' },
  ...(user.value ? [{ to: '/mypage', label: 'マイページ', icon: 'mdi-account-circle' }] : []),
  ...(user.value?.permissions?.includes('admin') ? [{ to: '/admin', label: '管理者画面', icon: 'mdi-shield-crown' }] : []),
])

const selected = ref([])

const handleLogout = async () => {
  drawer.value = false
  await logout()
}
</script>

<template>
  <div>
    <div class="top-bar">
      <!-- ハンバーガーボタン -->
      <div
        class="hamburger-box"
        :class="{ active: drawer }"
        @click="drawer = !drawer"
      >
        <svg viewBox="0 0 100 100" class="hamburger-svg">
          <rect x="20" y="20" width="60" height="60" class="fill-bg" />

          <g class="frame-group" :class="{ active: drawer }">
            <line x1="42" y1="20" x2="100" y2="20" class="frame-line ln-tr-h" />
            <line x1="80" y1="0" x2="80" y2="58" class="frame-line ln-tr-v" />
            <line x1="0" y1="80" x2="58" y2="80" class="frame-line ln-bl-h" />
            <line x1="20" y1="42" x2="20" y2="100" class="frame-line ln-bl-v" />
          </g>

          <g class="hamburger-lines" :class="{ active: drawer }">
            <line x1="30" y1="38" x2="70" y2="38" class="ham-line line-1" />
            <line x1="30" y1="50" x2="70" y2="50" class="ham-line line-2" />
            <line x1="30" y1="62" x2="70" y2="62" class="ham-line line-3" />
          </g>
        </svg>
      </div>
    </div>

    <!-- スライドメニュー -->
    <v-navigation-drawer
      v-model="drawer"
      temporary
      fixed
      class="drawer-menu"
    >
      <!-- ログイン状態表示エリア(ドロワー上部) -->
      <div class="drawer-account-area">
        <template v-if="user">
          <div class="drawer-user-info">
            <v-icon color="theme-color">mdi-account-circle</v-icon>
            <span class="drawer-user-name">{{ user.name }}</span>
          </div>
          <button class="drawer-logout-btn" @click="handleLogout">ログアウト</button>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="drawer-login-btn" @click="drawer = false">
            ログイン
          </NuxtLink>
        </template>
      </div>

      <v-divider class="mb-2"></v-divider>

      <v-list v-model:selected="selected" density="compact" nav>
        <v-list-item
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :value="link"
          color="theme-color"
          rounded="xl"
          class="mx-2"
          @click="drawer = false"
        >
          <template #prepend>
            <v-icon :style="{ opacity: 1 }" color="theme-color">
              {{ link.icon }}
            </v-icon>
          </template>
          <v-list-item-title class="font-weight-bold ml-2">
            {{ link.label }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1010;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
}

.hamburger-box {
  width: 44px;
  height: 44px;
  cursor: pointer;
  flex-shrink: 0;
}

.hamburger-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.fill-bg {
  fill: var(--color-accent, #ffd400);
}

.frame-line {
  stroke: var(--color-text, #000000);
  stroke-width: 4;
  stroke-linecap: square;
  transform-box: view-box;
  transition: transform 0.3s ease;
}

.frame-group {
  transform-box: view-box;
  transform-origin: 50px 50px;
  transform: rotate(0deg);
  transition: transform 0.3s ease;
}

.frame-group.active {
  transform: rotate(225deg);
}

.frame-group.active .ln-tr-h {
  transform: translate(-22px, 30px);
}

.frame-group.active .ln-tr-v {
  transform: translate(-30px, 20px);
}

.frame-group.active .ln-bl-h {
  transform: translate(22px, -30px);
}

.frame-group.active .ln-bl-v {
  transform: translate(30px, -20px);
}

.ham-line {
  stroke: var(--color-text, #000000);
  stroke-width: 5;
  stroke-linecap: round;
  opacity: 1;
  transition: opacity 0.15s ease;
}

.hamburger-lines.active .line-1 { opacity: 0; transition-delay: 0s; }
.hamburger-lines.active .line-2 { opacity: 0; transition-delay: 0.08s; }
.hamburger-lines.active .line-3 { opacity: 0; transition-delay: 0.16s; }

.hamburger-lines:not(.active) .line-1 { transition-delay: 0.16s; }
.hamburger-lines:not(.active) .line-2 { transition-delay: 0.08s; }
.hamburger-lines:not(.active) .line-3 { transition-delay: 0s; }

.drawer-menu {
  max-width: 280px;
}

.drawer-menu :deep(.v-list) {
  padding-top: 0;
}

/* ログイン状態表示エリア */
.drawer-account-area {
  padding: 60px 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.drawer-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-user-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--color-text, #000);
}

.drawer-logout-btn {
  border: 1px solid var(--color-text, #000);
  background: var(--color-bg, #fff);
  color: var(--color-text, #000);
  padding: 5px 12px;
  font-size: 0.8rem;
  cursor: pointer;
}

.drawer-login-btn {
  display: block;
  width: 100%;
  text-align: center;
  text-decoration: none;
  border: 1px solid var(--color-text, #000);
  background: var(--color-accent, #ffd400);
  color: var(--color-text, #000);
  padding: 8px;
  font-size: 0.9rem;
  font-weight: bold;
}
</style>