<script setup lang="ts">
const { t, locale, locales, localeShort, setLocale } = useAppLocale()
const auth = useAuthStore()
const route = useRoute()
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

const links = computed(() => [
  { label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: t('nav.tasks'), icon: 'i-lucide-list-checks', to: '/tasks' },
  { label: t('nav.calendar'), icon: 'i-lucide-calendar-days', to: '/calendar' },
  { label: t('nav.settings'), icon: 'i-lucide-settings', to: '/settings' }
])

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

const localeItems = computed(() =>
  locales.value.map((l) => ({
    label: l.name,
    icon: l.code === locale.value ? 'i-lucide-check' : undefined,
    onSelect: () => setLocale(l.code)
  }))
)

async function logout() {
  auth.logout()
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default">
      <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <UIcon name="i-lucide-notebook-pen" class="size-5 text-primary" />
          <span>{{ t('app.title') }}</span>
        </NuxtLink>

        <UNavigationMenu :items="links" class="hidden lg:flex" />

        <div class="ms-auto flex items-center gap-2">
          <UDropdownMenu :items="localeItems">
            <UButton
              icon="i-lucide-languages"
              color="neutral"
              variant="ghost"
              :label="localeShort"
              :aria-label="t('common.language')"
            />
          </UDropdownMenu>
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            :aria-label="t('auth.logout')"
            @click="logout"
          />
        </div>
        <ClientOnly>
          <UButton
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            color="neutral"
            variant="ghost"
            square
            :aria-label="isDark ? t('common.toLightMode') : t('common.toDarkMode')"
            @click="isDark = !isDark"
          />
          <template #fallback>
            <div class="size-8" />
          </template>
        </ClientOnly>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-6">
      <slot />
    </main>

    <!--
      Planshet va telefon o'lchamlarida (lg dan past) asosiy navigatsiya
      pastga yopishtirilgan icon-bar shaklida ko'rsatiladi — header esa
      yuqorida faqat brend/til/chiqish uchun qoladi. safe-area-inset-bottom
      iOS'dagi "home indicator" chizig'i panelni bosib qolmasligi uchun.
    -->
    <nav
      class="fixed inset-x-0 bottom-0 z-50 border-t border-default bg-default/95 backdrop-blur supports-backdrop-blur:bg-default/80 lg:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="mx-auto flex max-w-7xl items-stretch justify-around px-2">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors"
          :class="isActive(link.to) ? 'text-primary' : 'text-muted hover:text-default'"
        >
          <span
            class="flex items-center justify-center rounded-full px-3.5 py-1 transition-colors"
            :class="isActive(link.to) ? 'bg-primary/10' : ''"
          >
            <UIcon :name="link.icon" class="size-5" />
          </span>
          <span>{{ link.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
