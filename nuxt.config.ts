// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // Go backend manzili — .env da NUXT_PUBLIC_API_BASE orqali o'zgartiriladi
      apiBase: 'http://localhost:8080/api'
    }
  },

  i18n: {
    defaultLocale: 'uz',
    strategy: 'no_prefix',
    locales: [
      { code: 'uz', name: "O'zbekcha", file: 'uz.json' },
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root'
    }
  },

  eslint: {
    config: {
      stylistic: false
    }
  }
})
