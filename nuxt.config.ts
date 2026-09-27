// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
        { name: 'description', content: 'ツラトゥストラはかく語りきwiki' },

        // OGP
        { property: 'og:title', content: 'tsu-wiki' },
        { property: 'og:description', content: 'ツラトゥストラはかく語りきwiki' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://tsu.inami0.com' },
        //{ property: 'og:image', content: 'https://tsu.inami0.com/ogp.png' },
        { property: 'og:site_name', content: 'tsu-wiki' },
        { name: 'theme-color', content: '#ffd400' },
      ],
      
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=swap',
        },
      ],
    },
  },

  nitro: {
    preset: 'cloudflare-module',
  },
  
})

