<script setup lang="ts">
const { t } = useI18n()

useHead({ title: t('nav.dashboard') })

const stats = [
  { key: 'students', icon: 'i-lucide-users', value: 0 },
  { key: 'present', icon: 'i-lucide-user-check', value: 0 },
  { key: 'absent', icon: 'i-lucide-user-x', value: 0 }
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ t('nav.dashboard') }}</h1>
      <p class="text-muted">{{ t('app.subtitle') }}</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard v-for="s in stats" :key="s.key">
        <div class="flex items-center gap-3">
          <UIcon :name="s.icon" class="size-8 text-primary" />
          <div>
            <p class="text-sm text-muted">{{ t(`stats.${s.key}`) }}</p>
            <p class="text-2xl font-semibold">{{ s.value }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
