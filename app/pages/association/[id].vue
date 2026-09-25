<script setup>
const route = useRoute()
</script>

<template>
  <div>
    <h1>協会{{ route.params.id }}</h1>
    <p>詳細情報(NPC・PCなど)</p>
  </div>
</template>