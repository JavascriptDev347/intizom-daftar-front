<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('nav.dashboard') })

const toast = useToast()
const { get } = useDashboardApi()

type RangeKey = 'week' | 'month' | 'last30'
const range = ref<RangeKey>('last30')

const rangeOptions: { value: RangeKey; label: string }[] = [
  { value: 'week', label: 'dashboard.rangeWeek' },
  { value: 'month', label: 'dashboard.rangeMonth' },
  { value: 'last30', label: 'dashboard.rangeLast30' }
]

const rangeDates = computed(() => {
  const today = todayKey()
  if (range.value === 'week') return { from: addDays(today, -6), to: today }
  if (range.value === 'month') return { from: startOfMonth(today), to: today }
  return { from: addDays(today, -29), to: today }
})

const data = ref<DashboardData | null>(null)
const loading = ref(false)

async function fetchDashboard() {
  loading.value = true
  try {
    const res = await get(rangeDates.value.from, rangeDates.value.to)
    data.value = res.data
  } catch (err) {
    toast.add({
      title: t('dashboard.loadFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
watch(range, fetchDashboard)

const completionRate = computed(() => {
  if (!data.value) return 0
  const total = data.value.TotalDone + data.value.TotalMissed
  return total === 0 ? 0 : Math.round((data.value.TotalDone / total) * 100)
})

const stats = computed(() => [
  {
    key: 'totalDone',
    icon: 'i-lucide-check-circle-2',
    color: 'text-success',
    value: data.value?.TotalDone ?? 0
  },
  {
    key: 'totalMissed',
    icon: 'i-lucide-x-circle',
    color: 'text-error',
    value: data.value?.TotalMissed ?? 0
  },
  {
    key: 'completionRate',
    icon: 'i-lucide-percent',
    color: 'text-primary',
    value: `${completionRate.value}%`
  },
  {
    key: 'activeHabits',
    icon: 'i-lucide-list-checks',
    color: 'text-primary',
    value: data.value?.PerHabit.length ?? 0
  }
])

const sortedHabits = computed(
  () => [...(data.value?.PerHabit ?? [])].sort((a, b) => b.CurrentStreak - a.CurrentStreak)
)

function streakColor(streak: number) {
  if (streak >= 7) return 'success'
  if (streak >= 3) return 'warning'
  if (streak > 0) return 'primary'
  return 'neutral'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('nav.dashboard') }}</h1>
        <p class="text-muted">{{ t('app.subtitle') }}</p>
      </div>

      <UButtonGroup>
        <UButton
          v-for="opt in rangeOptions"
          :key="opt.value"
          :color="range === opt.value ? 'primary' : 'neutral'"
          :variant="range === opt.value ? 'solid' : 'soft'"
          size="sm"
          @click="range = opt.value"
        >
          {{ t(opt.label) }}
        </UButton>
      </UButtonGroup>
    </div>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <USkeleton v-for="i in 4" :key="i" class="h-24 w-full" />
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UCard v-for="s in stats" :key="s.key">
        <div class="flex items-center gap-3">
          <UIcon :name="s.icon" class="size-8" :class="s.color" />
          <div>
            <p class="text-sm text-muted">{{ t(`dashboard.${s.key}`) }}</p>
            <p class="text-2xl font-semibold">{{ s.value }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <div>
      <h2 class="mb-3 text-lg font-medium">{{ t('dashboard.perHabit') }}</h2>

      <div v-if="loading" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-16 w-full" />
      </div>

      <UCard v-else-if="sortedHabits.length === 0">
        <p class="py-6 text-center text-muted">{{ t('dashboard.noHabits') }}</p>
      </UCard>

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="h in sortedHabits" :key="h.Habit.ID">
          <p class="mb-3 truncate font-medium">{{ h.Habit.Name }}</p>
          <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-1 text-success">
              <UIcon name="i-lucide-check" class="size-4" />
              {{ h.DoneCount }}
            </span>
            <span class="flex items-center gap-1 text-error">
              <UIcon name="i-lucide-x" class="size-4" />
              {{ h.MissedCount }}
            </span>
            <UBadge :color="streakColor(h.CurrentStreak)" variant="subtle" icon="i-lucide-flame">
              {{ h.CurrentStreak }}
            </UBadge>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
