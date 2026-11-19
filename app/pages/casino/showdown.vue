<script setup>
// カジノの裏ページ: Showdown(公開前のため、一時的に admin だけが入れる)
definePageMeta({ middleware: 'admin' })

const { myPcs, selectedPcId, selectedPc } = await useMyPcs()
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
  font-size: 1.3rem;
  border-left: 5px solid var(--color-accent);
  padding-left: 10px;
  margin: 4px 0 16px;
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
