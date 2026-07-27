/**
 * docs/entry-crud.md — Entry uchun klassik CRUD (create/update/delete)
 * endpointlari yo'q, faqat o'qish + ikkita upsert amali bor (pastda).
 * Entry/DayEntry struct'larida `json` teg yo'q, shuning uchun /api/entries
 * PascalCase maydonlar bilan qaytadi: {"Habit":{...},"Entry":{...}|null}.
 * Faqat qo'lda yozilgan gin.H{} javoblar ({"done":true},
 * {"jazo_saved":true}) va so'rov tanasi (date/jazo) snake_case bo'lib qoladi.
 */
export interface Entry {
  ID: number
  HabitID: number
  UserID: number
  EntryDate: string
  Done: boolean
  Jazo: string | null
  CompletedAt: string | null
  CreatedAt: string
  UpdatedAt: string
}

/**
 * Uch holatli element: Entry === null — hali belgilanmagan,
 * Entry.Done === true — bajarilgan, Entry.Done === false — jazo bilan.
 */
export interface EntryItem {
  Habit: Habit
  Entry: Entry | null
}

/** Berilgan kun uchun barcha faol habit'lar + o'sha kungi holati. */
export function useEntries() {
  const api = useApi()

  function list(date?: string) {
    return api<ApiResponse<EntryItem[]>>('/entries', { query: date ? { date } : {} })
  }

  /** Upsert: shu (habit, sana) uchun mavjud entry bo'lsa ham xatosiz qayta yoziladi. */
  function markDone(habitId: number, date: string) {
    return api<ApiResponse<{ done: boolean }>>(`/habits/${habitId}/done`, {
      method: 'POST',
      body: { date }
    })
  }

  /** Upsert, xuddi markDone kabi — jazo bo'sh bo'lsa backend 400 qaytaradi. */
  function saveJazo(habitId: number, date: string, jazo: string) {
    return api<ApiResponse<{ jazo_saved: boolean }>>(`/habits/${habitId}/jazo`, {
      method: 'POST',
      body: { date, jazo }
    })
  }

  /**
   * docs/habit-continue.md — faqat shu (habit, sana) juftligini kunlik
   * ro'yxatdan yashiradi, boshqa hech qanday kunga (o'tmish ham, kelajak
   * ham) ta'sir qilmaydi. Qayta ko'rsatish (unhide) hozircha backendda yo'q.
   */
  function hideDay(habitId: number, date: string) {
    return api<ApiResponse<{ hidden: boolean }>>(`/habits/${habitId}/hide`, {
      method: 'POST',
      body: { date }
    })
  }

  return { list, markDone, saveJazo, hideDay }
}
