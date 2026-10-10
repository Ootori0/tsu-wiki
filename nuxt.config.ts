// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/variables.css'],

  build: {
    transpile: ['vuetify'],
  },

  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
    'nitro-cloudflare-dev',
  ],

  vite: {
    ssr: {
      noExternal: ['vuetify'],
    },
  },
  app: {
    head: {
      title: 'tsu-wiki',
      meta: [
        { name: 'description', content: 'ツァラトゥストラはかく語りきwiki' },

        // OGP
        { property: 'og:title', content: 'tsu-wiki' },
        { property: 'og:description', content: 'ツァラトゥストラはかく語りきwiki' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://tsu.inami0.com' },
        { property: 'og:image', content: 'https://tsu.inami0.com/icon.jpg' },
        { property: 'og:site_name', content: 'tsu-wiki' },
        { name: 'theme-color', content: '#ffd400' },
        { name: 'apple-mobile-web-app-title', content: 'tsu-wiki' },

        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'tsu-wiki' },
        { name: 'twitter:description', content: 'ツァラトゥストラはかく語りきwiki' },
        { name: 'twitter:image', content: 'https://tsu.inami0.com/icon.jpg' },
      ],

      link: [
        { rel: 'icon', type: 'image/jpeg', href: '/icon.jpg' },
        // ホーム画面に追加したときのアイコン
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  nitro: {
    preset: 'cloudflare-module',
  },
})