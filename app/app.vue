<template>
  <v-app>
    <AppLoading />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>


<style>
html, body {
  overflow-x: hidden;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: inherit;
}
</style>