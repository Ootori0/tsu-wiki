<script setup>
const items = [
  { id: 1, title: '世界観', body: '世界観の説明(仮テキスト)' },
  { id: 2, title: '歴史', body: '歴史の説明(仮テキスト)' },
  { id: 3, title: '地理', body: '地理の説明(仮テキスト)' },
  { id: 4, title: '用語集', body: '用語の説明(仮テキスト)' },
]
</script>

<template>
  <div class="page">
    <h1 class="page-title">背景設定集</h1>
    <AccordionList :items="items" />
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 72px 16px 48px;
}

.page-title {
  font-size: 1.3rem;
  border-left: 5px solid var(--color-accent);
  padding-left: 10px;
  margin-bottom: 20px;
}
</style>