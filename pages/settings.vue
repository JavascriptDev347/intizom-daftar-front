<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('nav.settings') })

const toast = useToast()
const { linkCode } = useTelegramApi()

const LINK_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000

const requesting = ref(false)
const linkData = ref<TelegramLinkCode | null>(null)
const expiresAt = ref<number | null>(null)
const cooldownUntil = ref<number | null>(null)
const now = ref(Date.now())

let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  ticker = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => clearInterval(ticker))

const remainingMs = computed(() => (expiresAt.value ? Math.max(0, expiresAt.value - now.value) : 0))
const isExpired = computed(() => !!linkData.value && remainingMs.value <= 0)
const cooldownRemainingMs = computed(() =>
  cooldownUntil.value ? Math.max(0, cooldownUntil.value - now.value) : 0
)
const isCoolingDown = computed(() => cooldownRemainingMs.value > 0)

function formatDuration(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const remainingLabel = computed(() => formatDuration(remainingMs.value))
const cooldownLabel = computed(() => formatDuration(cooldownRemainingMs.value))

/** `/start <code>` bilan botni ochadigan havola — doim shu, deep_link kelsa ham, kelmasa ham. */
const deepLink = computed(() =>
  linkData.value ? (linkData.value.deep_link ?? telegramDeepLink(linkData.value.code)) : null
)

async function requestLink() {
  if (isCoolingDown.value) return
  requesting.value = true
  try {
    const res = await linkCode()
    linkData.value = res.data
    expiresAt.value = Date.now() + LINK_TTL_MS
    cooldownUntil.value = null

    if (deepLink.value && !import.meta.server) {
      window.open(deepLink.value, '_blank')
    }
  } catch (err) {
    if (apiErrorStatus(err) === 429) {
      cooldownUntil.value = Date.now() + RATE_LIMIT_COOLDOWN_MS
      toast.add({
        title: t('settings.telegram.rateLimited'),
        description: apiErrorMessage(err, t('common.unknownError')),
        color: 'warning'
      })
    } else {
      toast.add({
        title: t('settings.telegram.requestFailed'),
        description: apiErrorMessage(err, t('common.unknownError')),
        color: 'error'
      })
    }
  } finally {
    requesting.value = false
  }
}

function openBot() {
  if (deepLink.value) window.open(deepLink.value, '_blank')
}

async function copyCode() {
  if (!linkData.value) return
  try {
    await navigator.clipboard.writeText(linkData.value.code)
    toast.add({ title: t('settings.telegram.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.telegram.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ t('settings.title') }}</h1>
      <p class="text-muted">{{ t('settings.subtitle') }}</p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-send" class="size-5 text-primary" />
          <h2 class="font-medium">{{ t('settings.telegram.title') }}</h2>
        </div>
      </template>

      <p class="text-sm text-muted">{{ t('settings.telegram.description') }}</p>

      <!-- Faol kod: hali eskirmagan -->
      <div v-if="linkData && !isExpired" class="mt-4 space-y-4">
        <UAlert
          color="primary"
          variant="soft"
          icon="i-lucide-send"
          :title="t('settings.telegram.openedTitle')"
          :description="t('settings.telegram.openedDescription')"
          :actions="[{ label: t('settings.telegram.openBot'), icon: 'i-lucide-external-link', onClick: openBot }]"
        />

        <div class="flex items-center justify-between gap-3 rounded-lg border border-default bg-elevated/50 p-4">
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-muted">{{ t('settings.telegram.codeLabel') }}</p>
            <code class="text-lg font-semibold tracking-wider">{{ linkData.code }}</code>
          </div>
          <UButton
            icon="i-lucide-copy"
            size="sm"
            color="neutral"
            variant="ghost"
            :aria-label="t('settings.telegram.copy')"
            @click="copyCode"
          />
        </div>

        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-clock" class="size-3.5" />
          {{ t('settings.telegram.expiresIn', { time: remainingLabel }) }}
        </p>
      </div>

      <!-- Kod eskirgan -->
      <UAlert
        v-else-if="linkData && isExpired"
        class="mt-4"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-triangle"
        :title="t('settings.telegram.expiredTitle')"
        :description="t('settings.telegram.expiredDescription')"
        :actions="[{ label: t('settings.telegram.retry'), onClick: requestLink }]"
      />

      <!-- Hali so'ralmagan -->
      <UButton
        v-else
        class="mt-4"
        icon="i-lucide-send"
        size="lg"
        :loading="requesting"
        :disabled="isCoolingDown"
        @click="requestLink"
      >
        {{ isCoolingDown ? t('settings.telegram.cooldown', { seconds: cooldownLabel }) : t('settings.telegram.connectCta') }}
      </UButton>
    </UCard>
  </div>
</template>
