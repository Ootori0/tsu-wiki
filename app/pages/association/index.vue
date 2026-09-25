<script setup>
const guilds = Array.from({ length: 10 }, (_, i) => i + 1)
</script>

<template>
  <div>
    <h1>協会</h1>
    <ul>
      <li v-for="id in guilds" :key="id">
        <NuxtLink :to="`/association/${id}`">協会{{ id }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>