<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('nav.tasks') })

const toast = useToast()
const { list: listEntries, markDone, saveJazo, hideDay } = useEntries()
const { archive, pause } = useHabits()

const selectedDate = ref(todayKey())
const items = ref<EntryItem[]>([])
const loading = ref(false)

async function fetchEntries() {
  loading.value = true
  try {
    const res = await listEntries(selectedDate.value)
    items.value = res.data
    buildContinueQueue()
  } catch (err) {
    toast.add({
      title: t('tasks.loadFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchEntries)
watch(selectedDate, fetchEntries)

const isToday = computed(() => selectedDate.value === todayKey())
function goPrevDay() {
  selectedDate.value = addDays(selectedDate.value, -1)
}
function goNextDay() {
  selectedDate.value = addDays(selectedDate.value, 1)
}
function goToday() {
  selectedDate.value = todayKey()
}

// --- "Bajardim" / "Bajarmadim" ---
// docs/entry-crud.md, 3-bo'lim: /done va /jazo ikkalasi ham upsert, shuning
// uchun foydalanuvchi istalgan vaqt fikrini o'zgartirib, boshqa tugmani
// bossa ham xatosiz qayta yozib qo'yiladi — hech qaysi holat "qulflanmaydi".
const markingId = ref<number | null>(null)
async function onMarkDone(item: EntryItem) {
  markingId.value = item.Habit.ID
  if (jazoOpenId.value === item.Habit.ID) closeJazo()
  try {
    await markDone(item.Habit.ID, selectedDate.value)
    await fetchEntries()
  } catch (err) {
    toast.add({
      title: t('tasks.actionFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    markingId.value = null
  }
}

// --- Jazo yozish/tahrirlash ---
const jazoOpenId = ref<number | null>(null)
const jazoDraft = ref('')
const savingJazo = ref(false)

function openJazo(item: EntryItem) {
  jazoOpenId.value = item.Habit.ID
  jazoDraft.value = item.Entry?.Jazo ?? ''
}
function closeJazo() {
  jazoOpenId.value = null
  jazoDraft.value = ''
}
async function onSaveJazo(item: EntryItem) {
  const text = jazoDraft.value.trim()
  if (!text) {
    toast.add({ title: t('tasks.jazoEmpty'), color: 'error' })
    return
  }
  savingJazo.value = true
  try {
    await saveJazo(item.Habit.ID, selectedDate.value, text)
    closeJazo()
    await fetchEntries()
  } catch (err) {
    toast.add({
      title: t('tasks.actionFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    savingJazo.value = false
  }
}

// --- Vazifa (habit) CRUD ---
const formOpen = ref(false)
const editingHabit = ref<Habit | null>(null)

function openCreate() {
  editingHabit.value = null
  formOpen.value = true
}
function openEdit(habit: Habit) {
  editingHabit.value = habit
  formOpen.value = true
}

const confirmOpen = ref(false)
const archivingHabit = ref<Habit | null>(null)
const archiving = ref(false)

function askArchive(habit: Habit) {
  archivingHabit.value = habit
  confirmOpen.value = true
}

async function onConfirmArchive() {
  if (!archivingHabit.value) return
  archiving.value = true
  try {
    await archive(archivingHabit.value.ID)
    toast.add({ title: t('tasks.archiveSuccess'), color: 'success' })
    confirmOpen.value = false
    await fetchEntries()
  } catch (err) {
    toast.add({
      title: t('tasks.archiveFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    archiving.value = false
  }
}

// --- "Bugun uchun o'tkazib yuborish" (hide) ---
// docs/habit-continue.md, 3.2: Archive'dan (butunlay, hamma kun) vizual va
// funksional jihatdan aniq ajratilgan — faqat joriy ko'rilayotgan kunga
// tegishli, boshqa hech qanday kunga ta'sir qilmaydi, qaytarib bo'lmaydi.
const hideConfirmOpen = ref(false)
const hidingItem = ref<EntryItem | null>(null)
const hiding = ref(false)

function askHide(item: EntryItem) {
  hidingItem.value = item
  hideConfirmOpen.value = true
}

async function onConfirmHide() {
  if (!hidingItem.value) return
  hiding.value = true
  try {
    await hideDay(hidingItem.value.Habit.ID, selectedDate.value)
    toast.add({ title: t('tasks.hideSuccess'), color: 'success' })
    hideConfirmOpen.value = false
    await fetchEntries()
  } catch (err) {
    toast.add({
      title: t('tasks.hideFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    hiding.value = false
  }
}

function actionsFor(item: EntryItem) {
  return [
    [
      { label: t('actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(item.Habit) },
      {
        label: t('tasks.hideForDay'),
        icon: 'i-lucide-eye-off',
        onSelect: () => askHide(item)
      }
    ],
    [
      {
        label: t('actions.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => askArchive(item.Habit)
      }
    ]
  ]
}

// --- "Bu odatni davom ettirasizmi?" (pause) ---
// docs/habit-continue.md, 3.1: faqat bugungi kunni ko'rayotganda, faqat
// kechadan buyon mavjud (bugun yaratilmagan) habitlar uchun so'raladi.
// "Ha" hech qanday so'rov yubormaydi — shunchaki sessionStorage'ga
// belgilanadi, shu qurilmada/sessiyada qayta so'ralmasligi uchun.
const CONTINUE_STORAGE_PREFIX = 'intizom:continue-asked:'

function continueAskedKey(habitId: number, date: string) {
  return `${CONTINUE_STORAGE_PREFIX}${habitId}:${date}`
}
function wasAskedToday(habitId: number, date: string) {
  if (import.meta.server) return true
  return sessionStorage.getItem(continueAskedKey(habitId, date)) === '1'
}
function markAsked(habitId: number, date: string) {
  if (import.meta.server) return
  sessionStorage.setItem(continueAskedKey(habitId, date), '1')
}

const continueQueue = ref<Habit[]>([])
const continueOpen = ref(false)
const continuePausing = ref(false)
const currentContinueHabit = computed(() => continueQueue.value[0] ?? null)

function buildContinueQueue() {
  const today = todayKey()
  if (selectedDate.value !== today) return
  continueQueue.value = items.value
    .map((i) => i.Habit)
    .filter((h) => isoToDateKey(h.CreatedAt) < today && !wasAskedToday(h.ID, today))
  continueOpen.value = continueQueue.value.length > 0
}

async function answerContinue(continueIt: boolean) {
  const habit = currentContinueHabit.value
  if (!habit) return
  const today = todayKey()
  markAsked(habit.ID, today)

  if (!continueIt) {
    continuePausing.value = true
    try {
      await pause(habit.ID, today)
    } catch (err) {
      toast.add({
        title: t('tasks.pauseFailed'),
        description: apiErrorMessage(err, t('common.unknownError')),
        color: 'error'
      })
    } finally {
      continuePausing.value = false
    }
  }

  continueQueue.value = continueQueue.value.slice(1)
  continueOpen.value = continueQueue.value.length > 0
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('nav.tasks') }}</h1>
        <p class="text-muted">{{ t('tasks.subtitle') }}</p>
      </div>
      <UButton icon="i-lucide-plus" size="lg" @click="openCreate">
        {{ t('tasks.addTask') }}
      </UButton>
    </div>

    <UCard>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          square
          :aria-label="t('tasks.prevDay')"
          @click="goPrevDay"
        />
        <UInput v-model="selectedDate" type="date" class="w-auto" />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          square
          :aria-label="t('tasks.nextDay')"
          @click="goNextDay"
        />
        <UButton v-if="!isToday" color="neutral" variant="soft" size="sm" @click="goToday">
          {{ t('tasks.today') }}
        </UButton>
        <UBadge v-else color="primary" variant="soft" class="ms-1">{{ t('tasks.today') }}</UBadge>
      </div>
    </UCard>

    <div v-if="loading" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-24 w-full" />
    </div>

    <UCard v-else-if="items.length === 0">
      <div class="flex flex-col items-center gap-3 py-8 text-center">
        <UIcon name="i-lucide-clipboard-list" class="size-10 text-muted" />
        <p class="text-muted">{{ t('tasks.empty') }}</p>
        <UButton icon="i-lucide-plus" @click="openCreate">{{ t('tasks.addTask') }}</UButton>
      </div>
    </UCard>

    <div v-else class="space-y-3">
      <UCard v-for="item in items" :key="item.Habit.ID">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ item.Habit.Name }}</p>
            <p v-if="item.Habit.Description" class="text-sm text-muted">
              {{ item.Habit.Description }}
            </p>
            <div class="mt-1 flex flex-wrap gap-1">
              <UBadge
                v-if="item.Habit.ScheduledTime"
                color="neutral"
                variant="subtle"
                icon="i-lucide-clock"
              >
                {{ item.Habit.ScheduledTime }}
              </UBadge>
              <UBadge v-if="item.Habit.PausedFrom" color="warning" variant="subtle" icon="i-lucide-pause">
                {{ t('tasks.pausedFromBadge', { date: isoToDateKey(item.Habit.PausedFrom) }) }}
              </UBadge>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <UButton
                size="sm"
                icon="i-lucide-check"
                :color="item.Entry?.Done === true ? 'success' : 'neutral'"
                :variant="item.Entry?.Done === true ? 'solid' : 'soft'"
                :loading="markingId === item.Habit.ID"
                @click="onMarkDone(item)"
              >
                {{ t('tasks.markDone') }}
              </UButton>
              <UButton
                size="sm"
                icon="i-lucide-x"
                :color="item.Entry?.Done === false ? 'error' : 'neutral'"
                :variant="item.Entry?.Done === false ? 'solid' : 'soft'"
                @click="openJazo(item)"
              >
                {{ t('tasks.markMissed') }}
              </UButton>
            </div>

            <div v-if="jazoOpenId === item.Habit.ID" class="mt-2 flex flex-col gap-2 sm:flex-row">
              <UInput
                v-model="jazoDraft"
                class="w-full sm:w-64"
                :placeholder="t('tasks.jazoPlaceholder')"
                autofocus
              />
              <div class="flex gap-2">
                <UButton size="sm" :loading="savingJazo" @click="onSaveJazo(item)">
                  {{ t('actions.save') }}
                </UButton>
                <UButton size="sm" color="neutral" variant="ghost" @click="closeJazo">
                  {{ t('actions.cancel') }}
                </UButton>
              </div>
            </div>
            <p v-else-if="item.Entry?.Jazo" class="mt-2 flex items-center gap-1.5 text-sm text-error">
              <UIcon name="i-lucide-siren" class="size-4 shrink-0" />
              <span>{{ item.Entry.Jazo }}</span>
              <button
                type="button"
                class="shrink-0 text-xs underline underline-offset-2 hover:no-underline"
                @click="openJazo(item)"
              >
                {{ t('tasks.editJazo') }}
              </button>
            </p>
          </div>

          <UDropdownMenu :items="actionsFor(item)">
            <UButton
              icon="i-lucide-more-vertical"
              color="neutral"
              variant="ghost"
              square
              :aria-label="t('tasks.taskActions')"
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <TaskFormModal v-model:open="formOpen" :habit="editingHabit" @saved="fetchEntries" />

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('tasks.archiveTitle')"
      :description="t('tasks.archiveDescription', { name: archivingHabit?.Name ?? '' })"
      :confirm-label="t('actions.delete')"
      :loading="archiving"
      @confirm="onConfirmArchive"
    />

    <ConfirmDialog
      v-model:open="hideConfirmOpen"
      :title="t('tasks.hideTitle')"
      :description="t('tasks.hideDescription', { name: hidingItem?.Habit.Name ?? '' })"
      :confirm-label="t('tasks.hideConfirm')"
      color="warning"
      :loading="hiding"
      @confirm="onConfirmHide"
    />

    <UModal v-model:open="continueOpen" :title="t('tasks.continueTitle')">
      <template #body>
        <p class="text-sm">
          {{ t('tasks.continueQuestion', { name: currentContinueHabit?.Name ?? '' }) }}
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton color="error" variant="soft" :loading="continuePausing" @click="answerContinue(false)">
            {{ t('actions.no') }}
          </UButton>
          <UButton color="success" @click="answerContinue(true)">
            {{ t('actions.yes') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
