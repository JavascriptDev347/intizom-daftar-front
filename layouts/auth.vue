<script setup lang="ts">
const { t, locale, locales, localeShort, setLocale } = useAppLocale()

const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

const localeItems = computed(() =>
  locales.value.map((l) => ({
    label: l.name,
    // Tanlangan tilni belgilab qo'yamiz, aks holda menyuda qaysi til faolligi bilinmaydi
    icon: l.code === locale.value ? 'i-lucide-check' : undefined,
    onSelect: () => setLocale(l.code)
  }))
)
</script>

<template>
  <div
    class="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4 py-10 transition-colors"
  >
    <!-- Controls float above the card, same on every viewport size -->
    <div class="fixed top-4 right-4 flex items-center gap-1 z-10">
      <!--
        ClientOnly: rang rejimi faqat brauzerda (localStorage/cookie) ma'lum
        bo'ladi, shuning uchun serverda chizilgan ikonka mijozdagisi bilan mos
        kelmay, hydration mismatch beradi. Fallback bir xil o'lchamni band
        qilib turadi, shunda tugma "sakramaydi".
      -->
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

      <UDropdownMenu :items="localeItems">
        <UButton
          icon="i-lucide-languages"
          color="neutral"
          variant="ghost"
          :label="localeShort"
          :aria-label="t('common.language')"
        />
      </UDropdownMenu>
    </div>

    <NuxtLink to="/" class="flex items-center gap-2 text-lg font-semibold">
      <UIcon name="i-lucide-notebook-pen" class="size-6 text-primary" />
      <span>{{ t('app.title') }}</span>
    </NuxtLink>

    <!--
      max-w-md + w-full is the whole trick for "same shape on laptop and
      phone": on a phone the card fills the width with side padding from the
      parent; on a laptop it stops growing at 28rem and centers itself. No
      separate mobile/desktop markup, no breakpoints needed for this part.
    -->
    <UCard
      class="w-full max-w-md shadow-xl ring-1 ring-gray-200 dark:ring-gray-800"
      :ui="{ body: 'p-6 sm:p-8' }"
    >
      <slot />
    </UCard>
  </div>
</template>
