<script setup>
const { data: items } = await useFetch('/api/spells', {
  query: { category: 'other' },
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">魔術、その他</h1>
    <SpellList :items="items" />
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