<script setup lang="ts">
const { t, locale, locales, localeShort, setLocale } = useAppLocale()
const auth = useAuthStore()

const links = computed(() => [
  { label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: t('nav.students'), icon: 'i-lucide-users', to: '/students' },
  { label: t('nav.attendance'), icon: 'i-lucide-clipboard-check', to: '/attendance' }
])

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

        <UNavigationMenu :items="links" class="hidden sm:flex" />

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
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
