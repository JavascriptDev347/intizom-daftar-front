<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{ habit?: Habit | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const toast = useToast()
const { create, update } = useHabits()

const isEdit = computed(() => Boolean(props.habit))
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

const schema = computed(() =>
  z.object({
    name: z.string().min(1, t('tasks.nameRequired')).max(255, t('tasks.nameMax')),
    description: z.string().max(2000, t('tasks.descriptionMax')),
    scheduled_time: z.string().refine((v) => v === '' || timePattern.test(v), {
      error: t('tasks.timeInvalid')
    })
  })
)

interface FormState {
  name: string
  description: string
  scheduled_time: string
}

const state = reactive<FormState>({ name: '', description: '', scheduled_time: '' })

function resetForm() {
  state.name = props.habit?.Name ?? ''
  state.description = props.habit?.Description ?? ''
  state.scheduled_time = props.habit?.ScheduledTime ?? ''
}

// Modal har safar ochilganda joriy (yoki bo'sh) qiymatlar bilan qayta to'ldiriladi —
// backend PUT to'liq qayta yozadi, shuning uchun forma har doim to'liq holatni ushlab turishi kerak.
watch(open, (isOpen) => {
  if (isOpen) resetForm()
})

async function onSubmit(event: FormSubmitEvent<FormState>) {
  const payload = {
    name: event.data.name.trim(),
    description: event.data.description.trim() || null,
    scheduled_time: event.data.scheduled_time || null
  }

  try {
    if (isEdit.value && props.habit) {
      await update(props.habit.ID, payload)
    } else {
      await create(payload)
    }
    toast.add({
      title: isEdit.value ? t('tasks.updateSuccess') : t('tasks.createSuccess'),
      color: 'success'
    })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({
      title: isEdit.value ? t('tasks.updateFailed') : t('tasks.createFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEdit ? t('tasks.editTitle') : t('tasks.createTitle')">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="t('tasks.name')" name="name" required>
          <UInput v-model="state.name" class="w-full" size="lg" autofocus />
        </UFormField>

        <UFormField :label="t('tasks.description')" name="description">
          <UTextarea v-model="state.description" class="w-full" :rows="3" />
        </UFormField>

        <UFormField
          :label="t('tasks.scheduledTime')"
          name="scheduled_time"
          :hint="t('tasks.scheduledTimeHint')"
        >
          <UInput v-model="state.scheduled_time" type="time" class="w-full sm:w-40" size="lg" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" @click="open = false">
            {{ t('actions.cancel') }}
          </UButton>
          <UButton type="submit" loading-auto>{{ t('actions.save') }}</UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
