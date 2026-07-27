<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useAppLocale()
const toast = useToast()
const api = useApi()
const auth = useAuthStore()

useHead({ title: () => t('auth.registerTitle') })

interface RegisterState {
  username: string
  email: string
  password: string
  confirmPassword: string
}

const state = reactive<RegisterState>({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// Chegaralar backend validatsiyasi bilan bir xil (task.md, 1-bo'lim):
// username 3–50 belgi, email formati, parol kamida 8 belgi.
//
// .refine() runs AFTER each individual field passes its own rule, and
// `path: ['confirmPassword']` is what attaches the mismatch error to that
// specific UFormField instead of showing a floating form-level error with
// nowhere to render. Forgetting `path` is the #1 mistake with cross-field
// Zod validation in Nuxt UI — the error fires but silently has no home.
const schema = computed(() =>
  z
    .object({
      username: z.string().min(3, t('auth.usernameMin')).max(50, t('auth.usernameMax')),
      email: z.email(t('auth.emailInvalid')),
      password: z.string().min(8, t('auth.passwordMin')),
      confirmPassword: z.string()
    })
    .refine((data) => data.password === data.confirmPassword, {
      error: t('auth.passwordMismatch'),
      path: ['confirmPassword']
    })
)

async function onSubmit(event: FormSubmitEvent<RegisterState>) {
  try {
    // POST /api/auth/register -> 201 { "data": { "token": "..." } }
    // Backend darhol token qaytaradi, shuning uchun login sahifasiga
    // qaytarmaymiz — foydalanuvchi to'g'ridan-to'g'ri ichkariga kiradi.
    // confirmPassword faqat client tomonida tekshiriladi, yuborilmaydi.
    const res = await api<ApiResponse<{ token: string }>>('/auth/register', {
      method: 'POST',
      body: {
        username: event.data.username.trim(),
        email: event.data.email.trim(),
        password: event.data.password
      }
    })

    auth.setSession(res.data.token)
    toast.add({ title: t('auth.registerSuccess'), color: 'success' })
    await navigateTo('/')
  } catch (err) {
    // 409 = email band, 400 = validatsiya xatosi.
    toast.add({
      title: t('auth.registerFailed'),
      description: apiErrorMessage(
        err,
        apiErrorStatus(err) === 409 ? t('auth.emailTaken') : t('common.unknownError')
      ),
      color: 'error'
    })
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('auth.registerTitle') }}
      </h1>
      <NuxtLink
        to="/auth/login"
        class="inline-flex items-center gap-0.5 text-sm font-semibold text-primary-500 hover:text-primary-600"
      >
        {{ t('auth.logIn') }}
        <UIcon name="i-lucide-chevron-right" class="size-4" />
      </NuxtLink>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="t('auth.username')" name="username">
        <UInput v-model="state.username" size="lg" class="w-full" autocomplete="username" />
      </UFormField>

      <UFormField :label="t('auth.email')" name="email">
        <UInput v-model="state.email" type="email" size="lg" class="w-full" autocomplete="email" />
      </UFormField>

      <UFormField :label="t('auth.password')" name="password">
        <UInput
          v-model="state.password"
          type="password"
          size="lg"
          class="w-full"
          autocomplete="new-password"
        />
      </UFormField>

      <UFormField :label="t('auth.confirmPassword')" name="confirmPassword">
        <UInput
          v-model="state.confirmPassword"
          type="password"
          size="lg"
          class="w-full"
          autocomplete="new-password"
        />
      </UFormField>

      <UButton type="submit" block size="lg" loading-auto class="mt-2">
        {{ t('auth.signUp') }}
      </UButton>
    </UForm>
  </div>
</template>
