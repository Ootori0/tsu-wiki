<script setup>
// カジノの裏ページ: Showdown(公開前のため、一時的に admin だけが入れる)
definePageMeta({ middleware: 'admin' })

const { myPcs, selectedPcId, selectedPc } = await useMyPcs()

// 裏ページの間だけ、ページ全体を暗い色にする(離れると外れる)
useHead({ htmlAttrs: { class: 'underground' } })
</script>

<template>
  <div class="page">
    <NuxtLink to="/casino" class="back-link">
      <v-icon icon="mdi-arrow-left" size="16" />カジノに戻る
    </NuxtLink>
    <header class="hero">
      <span class="hero-tag">裏カジノ</span>
      <h1 class="page-title">Showdown</h1>
      <p class="hero-sub">— 招かれた者だけの卓 —</p>
    </header>

    <p v-if="(myPcs ?? []).length === 0" class="notice">遊ぶにはマイページでPCを作成してください</p>
    <template v-else>
      <PcWallet v-model="selectedPcId" :pcs="myPcs ?? []" :pc="selectedPc" />
      <ShowdownTable />
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 72px 16px 48px;
  box-sizing: border-box;
  animation: page-in 0.35s ease-out;
}

/* 裏ページに入ったとき、奥から現れる */
@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  font-size: 0.85rem;
  color: var(--color-text, #000);
  text-decoration: none;
}

.hero {
  margin: 8px 0 20px;
  padding: 18px 0 14px;
  text-align: center;
  border-top: 1px solid var(--color-edge);
  border-bottom: 1px solid var(--color-edge);
}

.hero-tag {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 0.7rem;
  letter-spacing: 0.3em;
}

.page-title {
  margin: 10px 0 4px;
  font-size: 2rem;
  font-style: italic;
  letter-spacing: 0.12em;
  color: var(--color-accent);
  text-shadow: 0 0 12px rgba(217, 180, 74, 0.45), 2px 2px 0 var(--color-shadow);
}

.hero-sub {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  opacity: 0.6;
}

.page :deep(.wallet) {
  border-color: var(--color-edge);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.notice {
  font-size: 0.85rem;
}

@media (prefers-reduced-motion: reduce) {
  .page {
    animation: none;
  }
}
</style>

<style>
/* 裏ページの配色(html に underground が付いている間だけ効く) */
html.underground {
  --color-page: #0d0a0a;
  --color-bg: #171212;
  --color-text: #ece4d6;
  --color-line: rgba(255, 255, 255, 0.12);
  --color-accent: #d9b44a;
  --color-accent-strong: #e8c55a;
  --color-accent-soft: rgba(217, 180, 74, 0.15);
  --color-edge: #8a7230;
  --color-shadow: #5a0c0c;
  --color-track: #2a2020;
  --color-error: #ff6b6b;
  color-scheme: dark;
}

html.underground body,
html.underground .v-application {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(120, 16, 16, 0.35), transparent 60%),
    var(--color-page) !important;
  background-attachment: fixed !important;
}
</style>
