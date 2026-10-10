<script setup>
definePageMeta({ middleware: 'auth' })

const { myPcs, selectedPcId, selectedPc } = await useMyPcs()
</script>

<template>
  <div class="page">
    <h1 class="page-title">カジノ[アーリア]</h1>

    <p v-if="(myPcs ?? []).length === 0" class="notice">
      遊ぶにはマイページでPCを作成してください
    </p>
    <PcWallet v-else v-model="selectedPcId" :pcs="myPcs ?? []" :pc="selectedPc" />

    <div class="coming-soon">
      <v-icon icon="mdi-cards-playing" size="40" />
      <p class="coming-title">ゲームは準備中です</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 72px 16px 48px;
  box-sizing: border-box;
}

.page-title {
  font-size: 1.3rem;
  border-left: 5px solid var(--color-accent);
  padding-left: 10px;
  margin-bottom: 16px;
}

.notice {
  font-size: 0.85rem;
  opacity: 0.6;
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 16px;
  border: 2px dashed var(--color-text, #000);
  color: var(--color-text, #000);
}

.coming-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: bold;
}
</style>
