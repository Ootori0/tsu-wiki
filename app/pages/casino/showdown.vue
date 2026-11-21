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
    <h1 class="page-title">Showdown</h1>

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

.page-title {
  margin: 4px 0 16px;
  padding-left: 10px;
  border-left: 5px solid var(--color-accent);
  color: var(--color-text);
  font-size: 1.3rem;
  letter-spacing: 0.08em;
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
