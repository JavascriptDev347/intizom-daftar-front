import type { $Fetch, FetchError } from 'ofetch'

/** Backend muvaffaqiyatli javobni doim `{ "data": ... }` ichida qaytaradi. */
export interface ApiResponse<T> {
  data: T
}

/** Xatolik javobi: `{ "error": "tushunarli xabar" }`. */
export interface ApiError {
  error?: string
}

/**
 * Go backend bilan ishlash uchun $fetch instansiyasi.
 * Auth token avtomatik Authorization header'ga qo'shiladi,
 * 401 kelganda sessiya tozalanib, /auth/login ga yo'naltiriladi.
 */
export function useApi(): $Fetch {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  return $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ options }) {
      if (auth.token) {
        options.headers.set('Authorization', `Bearer ${auth.token}`)
      }
    },
    async onResponseError({ response }) {
      // 401 = token muddati tugagan yoki noto'g'ri (task.md, 4-eslatma).
      // Login/register so'rovlarining o'zi ham 401 qaytarishi mumkin — u holda
      // foydalanuvchi allaqachon login sahifasida, redirect zararsiz.
      if (response.status === 401) {
        auth.logout()
        await navigateTo('/auth/login')
      }
    }
  })
}

/**
 * Backend yuborgan xato matnini ajratib oladi, bo'lmasa — `fallback`.
 * Tarmoq uzilganda ham (response yo'q) fallback qaytadi.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as FetchError<ApiError>)?.data
  return data?.error?.trim() || fallback
}

/** So'rov javobining HTTP statusi (masalan 409 — email band). */
export function apiErrorStatus(err: unknown): number | undefined {
  return (err as FetchError)?.statusCode
}
