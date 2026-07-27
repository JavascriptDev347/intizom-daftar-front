<script setup lang="ts">
const { t, locale } = useI18n()
useHead({ title: () => t('nav.calendar') })

const toast = useToast()
const { get: getCalendar } = useCalendarApi()
const { list: listEntries } = useEntries()

const cursor = ref(startOfMonth(todayKey()))
const grid = computed(() => buildMonthGrid(cursor.value))
const dataMap = ref<Record<string, CalendarDay>>({})
const loading = ref(false)

const monthLabel = computed(() => {
  const [y, m] = cursor.value.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1)
  )
})

// Dushanbadan boshlanadigan hafta kunlari nomlari, joriy tilda.
const weekdayLabels = computed(() => {
  const monday = new Date(2026, 0, 5)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(d)
  })
})

async function fetchMonth() {
  loading.value = true
  try {
    const res = await getCalendar(startOfMonth(cursor.value), endOfMonth(cursor.value))
    const map: Record<string, CalendarDay> = {}
    for (const day of res.data) map[isoToDateKey(day.Date)] = day
    dataMap.value = map
  } catch (err) {
    toast.add({
      title: t('calendar.loadFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchMonth)
watch(cursor, fetchMonth)

function goPrevMonth() {
  cursor.value = addMonths(cursor.value, -1)
}
function goNextMonth() {
  cursor.value = addMonths(cursor.value, 1)
}
function goCurrentMonth() {
  cursor.value = startOfMonth(todayKey())
}

type DayStatus = 'empty' | 'full' | 'partial' | 'none'

function dayStatus(dateKey: string): DayStatus {
  const day = dataMap.value[dateKey]
  if (!day || day.Total === 0) return 'empty'
  if (day.Done >= day.Total) return 'full'
  if (day.Done === 0) return 'none'
  return 'partial'
}

const statusClasses: Record<DayStatus, string> = {
  empty: 'bg-transparent',
  full: 'bg-success/15 text-success ring-1 ring-success/40',
  partial: 'bg-warning/15 text-warning ring-1 ring-warning/40',
  none: 'bg-error/15 text-error ring-1 ring-error/40'
}

function isCurrentMonth(dateKey: string) {
  return dateKey.slice(0, 7) === cursor.value.slice(0, 7)
}
function isToday(dateKey: string) {
  return dateKey === todayKey()
}
function dayNumber(dateKey: string) {
  return Number(dateKey.slice(-2))
}

// --- Kun detali (modal) ---
const detailOpen = ref(false)
const detailDate = ref('')
const detailItems = ref<EntryItem[]>([])
const detailLoading = ref(false)

const detailDateLabel = computed(() => {
  if (!detailDate.value) return ''
  const [y, m, d] = detailDate.value.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(y, m - 1, d))
})

async function openDay(dateKey: string) {
  detailDate.value = dateKey
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res = await listEntries(dateKey)
    detailItems.value = res.data
  } catch (err) {
    toast.add({
      title: t('calendar.loadFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ t('nav.calendar') }}</h1>
      <p class="text-muted">{{ t('calendar.subtitle') }}</p>
    </div>

    <UCard :ui="{ body: 'p-3 sm:p-4' }">
      <div class="mb-4 flex items-center justify-between gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          square
          :aria-label="t('calendar.prevMonth')"
          @click="goPrevMonth"
        />
        <div class="flex items-center gap-2">
          <h2 class="text-center text-lg font-medium capitalize">{{ monthLabel }}</h2>
          <UButton size="xs" color="neutral" variant="soft" @click="goCurrentMonth">
            {{ t('tasks.today') }}
          </UButton>
        </div>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          square
          :aria-label="t('calendar.nextMonth')"
          @click="goNextMonth"
        />
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted sm:gap-2">
        <span v-for="wd in weekdayLabels" :key="wd" class="py-1 capitalize">{{ wd }}</span>
      </div>

      <div class="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
        <button
          v-for="day in grid"
          :key="day"
          type="button"
          class="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg transition hover:bg-elevated disabled:cursor-default disabled:opacity-40"
          :disabled="loading"
          :class="[statusClasses[dayStatus(day)], !isCurrentMonth(day) && 'opacity-40']"
          @click="openDay(day)"
        >
          <span class="text-xs sm:text-sm" :class="isToday(day) && 'font-bold underline'">
            {{ dayNumber(day) }}
          </span>
          <span v-if="dataMap[day]" class="text-[10px] font-semibold sm:text-xs">
            {{ dataMap[day].Total }}
          </span>
        </button>
      </div>

      <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-success" />
          {{ t('calendar.legendFull') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-warning" />
          {{ t('calendar.legendPartial') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-error" />
          {{ t('calendar.legendMissed') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full border border-default" />
          {{ t('calendar.legendEmpty') }}
        </span>
      </div>
    </UCard>

    <UModal v-model:open="detailOpen" :title="detailDateLabel">
      <template #body>
        <div v-if="detailLoading" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
        </div>
        <p v-else-if="detailItems.length === 0" class="text-sm text-muted">
          {{ t('calendar.noHabits') }}
        </p>
        <ul v-else class="space-y-2">
          <li
            v-for="item in detailItems"
            :key="item.Habit.ID"
            class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2"
          >
            <span class="truncate">{{ item.Habit.Name }}</span>
            <UBadge v-if="item.Entry?.Done === true" color="success" variant="subtle">
              {{ t('tasks.done') }}
            </UBadge>
            <UBadge v-else-if="item.Entry?.Done === false" color="error" variant="subtle">
              {{ t('tasks.missed') }}
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle">{{ t('tasks.pending') }}</UBadge>
          </li>
        </ul>
      </template>
    </UModal>
  </div>
</template>
