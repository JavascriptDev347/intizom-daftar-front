<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { t } = useAppLocale()
const toast = useToast()
const api = useApi()
const auth = useAuthStore()
const { loginRequest, loginStatus } = useTelegramApi()

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

// --- Telegram orqali kirish (docs/telegram-frontend-integration.md, 5-bo'lim) ---
// Muqolib usul, faqat avval "sozlamalar"da Telegram bog'lagan akkauntlar uchun.
// Websocket yo'q — status har 2 soniyada poll qilinadi, sessiya 5 daqiqa amal qiladi.
const POLL_INTERVAL_MS = 2000

type TgState = 'idle' | 'pending' | 'expired' | 'not_linked'
const tgState = ref<TgState>('idle')
const tgRequesting = ref(false)
const tgSession = ref<TelegramLoginRequest | null>(null)
const tgExpiresAt = ref<number | null>(null)
const now = ref(Date.now())

let tickTimer: ReturnType<typeof setInterval> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  tickTimer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => {
  clearInterval(tickTimer)
  stopPolling()
})

function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = undefined
}

const remainingMs = computed(() => (tgExpiresAt.value ? Math.max(0, tgExpiresAt.value - now.value) : 0))

function formatDuration(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const remainingLabel = computed(() => formatDuration(remainingMs.value))

function telegramLoginDeepLink(session: TelegramLoginRequest) {
  return session.deep_link ?? telegramDeepLink(`login_${session.token}`)
}

async function startTelegramLogin() {
  tgRequesting.value = true
  try {
    const res = await loginRequest()
    tgSession.value = res.data
    tgExpiresAt.value = Date.now() + res.data.expires_in * 1000
    tgState.value = 'pending'

    if (!import.meta.server) window.open(telegramLoginDeepLink(res.data), '_blank')

    startPolling(res.data.token)
  } catch (err) {
    toast.add({
      title: t('auth.telegramRequestFailed'),
      description: apiErrorMessage(err, t('common.unknownError')),
      color: 'error'
    })
  } finally {
    tgRequesting.value = false
  }
}

function startPolling(token: string) {
  stopPolling()
  let unexpectedErrorShown = false
  pollTimer = setInterval(async () => {
    if (tgExpiresAt.value && Date.now() >= tgExpiresAt.value) {
      tgState.value = 'expired'
      stopPolling()
      return
    }
    try {
      const res = await loginStatus(token)
      const status = res?.data?.status
      if (status === 'confirmed') {
        stopPolling()
        auth.setSession(res.data.token)
        await navigateTo('/')
      } else if (status === 'not_linked') {
        tgState.value = 'not_linked'
        stopPolling()
      } else if (status !== 'pending') {
        // Kutilmagan javob shakli — jimgina yutib yubormaslik uchun, aks holda
        // "confirmed" kelsa ham sezilmay, cheksiz poll qilib qolishi mumkin edi.
        console.error('Kutilmagan telegram login-status javobi:', res)
      }
      // 'pending' -> keyingi tikda qayta so'raladi
    } catch (err) {
      // Sessiya topilmadi/muddati o'tgan (404) — boshqa xatolar (tarmoq uzilishi
      // kabi) o'tkazib yuboriladi, keyingi tikda qayta urinish uchun, lekin
      // birinchi marta ko'ringanda foydalanuvchiga bildiriladi (jim qolmasin).
      if (apiErrorStatus(err) === 404) {
        tgState.value = 'expired'
        stopPolling()
      } else if (!unexpectedErrorShown) {
        unexpectedErrorShown = true
        console.error('telegram login-status so‘rovida xatolik:', err)
        toast.add({
          title: t('auth.telegramRequestFailed'),
          description: apiErrorMessage(err, t('common.unknownError')),
          color: 'warning'
        })
      }
    }
  }, POLL_INTERVAL_MS)
}

function openTelegramBot() {
  if (tgSession.value) window.open(telegramLoginDeepLink(tgSession.value), '_blank')
}

function resetTelegramLogin() {
  stopPolling()
  tgState.value = 'idle'
  tgSession.value = null
  tgExpiresAt.value = null
}

function retryTelegramLogin() {
  resetTelegramLogin()
  startTelegramLogin()
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

    <USeparator :label="t('auth.or')" class="my-6" />

    <UButton
      v-if="tgState === 'idle'"
      block
      size="lg"
      color="neutral"
      variant="soft"
      icon="i-lucide-send"
      :loading="tgRequesting"
      :disabled="tgRequesting"
      @click="startTelegramLogin"
    >
      {{ t('auth.telegramLoginCta') }}
    </UButton>

    <div v-else-if="tgState === 'pending'" class="space-y-3">
      <UAlert
        color="primary"
        variant="soft"
        icon="i-lucide-send"
        :title="t('auth.telegramWaitingTitle')"
        :description="t('auth.telegramWaitingDescription')"
        :actions="[{ label: t('auth.telegramOpenBot'), icon: 'i-lucide-external-link', onClick: openTelegramBot }]"
      />
      <div class="flex items-center justify-between text-xs text-muted">
        <span class="flex items-center gap-1.5">
          <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
          {{ t('auth.telegramExpiresIn', { time: remainingLabel }) }}
        </span>
        <button
          type="button"
          class="underline underline-offset-2 hover:no-underline"
          @click="resetTelegramLogin"
        >
          {{ t('auth.telegramCancel') }}
        </button>
      </div>
    </div>

    <UAlert
      v-else-if="tgState === 'expired'"
      color="warning"
      variant="soft"
      icon="i-lucide-alert-triangle"
      :title="t('auth.telegramExpiredTitle')"
      :description="t('auth.telegramExpiredDescription')"
      :actions="[{ label: t('auth.telegramRetry'), onClick: retryTelegramLogin }]"
    />

    <UAlert
      v-else-if="tgState === 'not_linked'"
      color="error"
      variant="soft"
      icon="i-lucide-user-x"
      :title="t('auth.telegramNotLinkedTitle')"
      :description="t('auth.telegramNotLinkedDescription')"
      :actions="[{ label: t('auth.telegramBackToPassword'), onClick: resetTelegramLogin }]"
    />
  </div>
</template>
