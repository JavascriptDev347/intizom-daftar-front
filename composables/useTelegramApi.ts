/**
 * docs/telegram-frontend-integration.md — bu javoblar backend'da alohida
 * (snake_case) struct sifatida qaytadi, shuning uchun boshqa composable'lardan
 * farqli o'laroq PascalCase emas.
 */
export interface TelegramLinkCode {
  code: string
  instructions: string
  deep_link?: string
}

export interface TelegramLoginRequest {
  token: string
  instructions: string
  deep_link?: string
  expires_in: number
}

export type TelegramLoginStatus =
  | { status: 'pending' }
  | { status: 'confirmed'; token: string }
  | { status: 'not_linked' }

/** Backend `deep_link` qaytarmasa ham (TELEGRAM_BOT_USERNAME sozlanmagan), shu username bilan o'zimiz quramiz. */
export const TELEGRAM_BOT_USERNAME = 'intizom_daftar_bot'

export function telegramDeepLink(startParam: string) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${startParam}`
}

export function useTelegramApi() {
  const api = useApi()

  /** Rate limit: 1 foydalanuvchi — 1 daqiqada 1 marta chaqirishi mumkin (429). Auth talab qiladi. */
  function linkCode() {
    return api<ApiResponse<TelegramLinkCode>>('/telegram/link-code', { method: 'POST' })
  }

  /** Login sahifasida, auth talab qilmaydi — hali JWT yo'q paytda ishlatiladi. */
  function loginRequest() {
    return api<ApiResponse<TelegramLoginRequest>>('/auth/telegram/login-request', { method: 'POST' })
  }

  /** Har 2 soniyada poll qilinadi. 404 — sessiya topilmadi/muddati o'tgan. */
  function loginStatus(token: string) {
    return api<ApiResponse<TelegramLoginStatus>>(`/auth/telegram/login-status/${token}`)
  }

  return { linkCode, loginRequest, loginStatus }
}
