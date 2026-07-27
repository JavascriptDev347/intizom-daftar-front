
// Tarjimalar shu yerda emas — ular i18n/locales/*.json fayllarida turadi va
// @nuxtjs/i18n moduli ularni yuklaydi (nuxt.config.ts -> i18n.locales).
// Bu composable faqat ingichka qobiq: useI18n() ustiga til almashtirish
// yordamchilarini qo'shadi, shunda komponentlar `locales`ni har safar
// qo'lda map qilib o'tirmaydi.
//
// Yangi kalit kerak bo'lsa — JSON fayllarga qo'shiladi, bu faylga emas.
//
// DIQQAT — nomi nega `useAppLocale`, `useLocale` emas:
// @nuxt/ui ning o'zida `useLocale` composable'i bor (uning ichki komponent
// matnlari uchun) va u ham auto-import qilinadi. Ikkalasi bir xil nomlansa,
// Nuxt modulnikini ustun qo'yadi va bizniki jimgina e'tiborsiz qoladi —
// natijada `t('auth.email')` kabi kalitlar umuman ishlamaydi. Shuning uchun
// nom ataylab boshqacha.

import type { LocaleObject } from '@nuxtjs/i18n'

export function useAppLocale() {
  const { t, locale, locales, setLocale } = useI18n()

  /** Til tanlash menyusi uchun: [{ code: 'uz', name: "O'zbekcha" }, ...] */
  const localeOptions = computed(() =>
    (locales.value as LocaleObject[]).map((l) => ({
      code: l.code,
      name: l.name ?? l.code
    }))
  )

  /** Joriy tilning ko'rinadigan nomi ("O'zbekcha"). */
  const localeName = computed(
    () => localeOptions.value.find((l) => l.code === locale.value)?.name ?? locale.value
  )

  /** Tugma yorlig'i uchun qisqa kod ("UZ"). */
  const localeShort = computed(() => locale.value.toUpperCase())

  /**
   * Ro'yxatdagi keyingi tilga o'tadi (oxirgisidan keyin — birinchisiga).
   * Ikkitadan ortiq til bo'lsa, tanlash menyusini (localeOptions) ishlating.
   */
  async function toggle() {
    const codes = localeOptions.value.map((l) => l.code)
    const next = codes[(codes.indexOf(locale.value) + 1) % codes.length]
    if (next) await setLocale(next)
  }

  return { t, locale, locales: localeOptions, localeName, localeShort, setLocale, toggle }
}
