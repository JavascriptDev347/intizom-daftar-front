<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useAppLocale()
const toast = useToast()
const api = useApi()
const auth = useAuthStore()

useHead({ title: () => t('auth.loginTitle') })

// Wrapped in computed(): if this were a plain const, switching the language
// would NOT update already-shown validation messages, because the schema
// object (and the strings baked into it) would only ever be built once, on
// first render. Recomputing it off the active locale keeps error text in sync
// with the switcher in the corner. This is the single most common bug in
// i18n + Zod/Valibot setups — worth internalizing, not just copying.
const schema = computed(() =>
  z.object({
    email: z.email(t('auth.emailInvalid')),
    password: z.string().min(8, t('auth.passwordMin'))
  })
)

interface LoginState {
  email: string
  password: string
}

const state = reactive<LoginState>({
  email: '',
  password: ''
})

async function onSubmit(event: FormSubmitEvent<LoginState>) {
  try {
    // POST /api/auth/login -> { "data": { "token": "..." } }
    const res = await api<ApiResponse<{ token: string }>>('/auth/login', {
      method: 'POST',
      body: {
        email: event.data.email.trim(),
        password: event.data.password
      }
    })

    auth.setSession(res.data.token)
    await navigateTo('/')
  } catch (err) {
    // 401 = email/parol xato, 400 = validatsiya. Backend o'qishga yaroqli
    // matn yuboradi; yo'q bo'lsa tarjima qilingan umumiy xabar ishlatiladi.
    toast.add({
      title: t('auth.loginFailed'),
      description: apiErrorMessage(
        err,
        apiErrorStatus(err) === 401 ? t('auth.invalidCredentials') : t('common.unknownError')
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
        {{ t('auth.loginTitle') }}
      </h1>
      <NuxtLink
        to="/auth/register"
        class="inline-flex items-center gap-0.5 text-sm font-semibold text-primary-500 hover:text-primary-600"
      >
        {{ t('auth.signUp') }}
        <UIcon name="i-lucide-chevron-right" class="size-4" />
      </NuxtLink>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="t('auth.email')" name="email">
        <UInput v-model="state.email" type="email" size="lg" class="w-full" autocomplete="email" />
      </UFormField>

      <UFormField :label="t('auth.password')" name="password">
        <UInput
          v-model="state.password"
          type="password"
          size="lg"
          class="w-full"
          autocomplete="current-password"
        />
      </UFormField>

      <!--
        loading-auto ties the button's loading state directly to the promise
        returned by @submit — no manual `const loading = ref(false)` +
        try/finally toggling needed. One less place to forget to reset state
        on an early return or thrown error.
      -->
      <UButton type="submit" block size="lg" loading-auto class="mt-2">
        {{ t('auth.logIn') }}
      </UButton>
    </UForm>
  </div>
</template>
