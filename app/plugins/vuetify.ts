import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'tsuTheme',
      themes: {
        tsuTheme: {
          dark: false,
          colors: {
            background: '#ffffff',
            surface: '#ffffff',
            'theme-color': '#ffd400', // 装飾色(黄色)
            'on-background': '#000000',
            'on-surface': '#000000',
          },
        },
      },
    },
  })
  app.vueApp.use(vuetify)
})