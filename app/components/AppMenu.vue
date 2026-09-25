<script setup>
const drawer = ref(false)

const links = [
  { to: '/', label: '表紙', icon: 'mdi-home' },
  { to: '/association', label: '協会', icon: 'mdi-bank' },
  { to: '/pc', label: 'PC', icon: 'mdi-account' },
  { to: '/magic', label: '魔法', icon: 'mdi-magic-staff' },
  { to: '/magic/tool', label: '魔道具', icon: 'mdi-flask' },
  { to: '/magic/other', label: '魔術、その他', icon: 'mdi-star-four-points' },
  { to: '/magic-guide', label: '魔法作成のすゝめ', icon: 'mdi-book-open-variant' },
  { to: '/faq', label: 'よくある質問,裁定', icon: 'mdi-help-circle-outline' },
]

const selected = ref([])
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
          <!-- 背景(黄色塗りつぶし) -->
          <rect x="20" y="20" width="60" height="60" class="fill-bg" />

          <!-- 枠線:右上・左下の4本。タップで中央に集まり十字→135度回転で× -->
          <g class="frame-group" :class="{ active: drawer }">
            <!-- 右上:横線 -->
            <line x1="42" y1="20" x2="100" y2="20" class="frame-line ln-tr-h" />
            <!-- 右上:縦線 -->
            <line x1="80" y1="0" x2="80" y2="58" class="frame-line ln-tr-v" />
            <!-- 左下:横線 -->
            <line x1="0" y1="80" x2="58" y2="80" class="frame-line ln-bl-h" />
            <!-- 左下:縦線 -->
            <line x1="20" y1="42" x2="20" y2="100" class="frame-line ln-bl-v" />
          </g>

          <!-- 待機状態:三本線(タップで上から順に消える) -->
          <g class="hamburger-lines" :class="{ active: drawer }">
            <line x1="30" y1="38" x2="70" y2="38" class="ham-line line-1" />
            <line x1="30" y1="50" x2="70" y2="50" class="ham-line line-2" />
            <line x1="30" y1="62" x2="70" y2="62" class="ham-line line-3" />
          </g>
        </svg>
      </div>

      <!-- ×ボタンの隣(ログインボタン用の空欄) -->
      <div class="login-placeholder"></div>
    </div>

    <!-- スライドメニュー -->
    <v-navigation-drawer
      v-model="drawer"
      temporary
      fixed
      class="drawer-menu"
    >
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
}

/* 枠線グループ:各線を個別にtranslateで中央寄せ→十字化 */
/* ==================================================
   枠線
   ================================================== */

.frame-line {
  stroke: var(--color-text, #000000);
  stroke-width: 4;
  stroke-linecap: square;

  transform-box: view-box;
  transition: transform 0.3s ease;
}

/* 通常状態 */
.frame-group {
  transform-box: view-box;
  transform-origin: 50px 50px;

  transform: rotate(0deg);
  transition: transform 0.3s ease;
}

/* 開く：
  4本の線を中央へスライド
  ＋
  グループを同時に回転
*/
.frame-group.active {
  transform: rotate(225deg);
}

/* 右上・横 */
.frame-group.active .ln-tr-h {
  transform: translate(-22px, 30px);
}

/* 右上・縦 */
.frame-group.active .ln-tr-v {
  transform: translate(-30px, 20px);
}

/* 左下・横 */
.frame-group.active .ln-bl-h {
  transform: translate(22px, -30px);
}

/* 左下・縦 */
.frame-group.active .ln-bl-v {
  transform: translate(30px, -20px);
}

/* 三本線(タップで上から順に消える) */
.ham-line {
  stroke: var(--color-text, #000000);
  stroke-width: 5;
  stroke-linecap: round;

  opacity: 1;
  transition: opacity 0.15s ease;
}

/* 開く：上 → 下 */
.hamburger-lines.active .line-1 {
  opacity: 0;
  transition-delay: 0s;
}

.hamburger-lines.active .line-2 {
  opacity: 0;
  transition-delay: 0.08s;
}

.hamburger-lines.active .line-3 {
  opacity: 0;
  transition-delay: 0.16s;
}

/* 閉じる：下 → 上 */
.hamburger-lines:not(.active) .line-1 {
  transition-delay: 0.16s;
}

.hamburger-lines:not(.active) .line-2 {
  transition-delay: 0.08s;
}

.hamburger-lines:not(.active) .line-3 {
  transition-delay: 0s;
}
/* ×ボタンの隣(ログインボタン用、現在は空) */
.login-placeholder {
  flex: 1;
  height: 44px;
}

.drawer-menu {
  max-width: 280px;
}

.drawer-menu :deep(.v-list) {
  padding-top: 60px;
}
</style>