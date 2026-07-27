/**
 * docs/habit-crud.md, 3-bo'lim — Habits (mashg'ulotlar).
 *
 * DIQQAT: Go'dagi Habit struct'da `json` teg yo'q, shuning uchun backend bu
 * obyektni PascalCase maydonlar bilan qaytaradi (ID/Name/ScheduledTime/...) —
 * bu qoida shu struct ishlatilgan HAR bir joyga tegishli: to'g'ridan-to'g'ri
 * /api/habits javobida ham, /api/entries va /api/dashboard ichiga
 * ichma-ich joylashtirilgan "habit" maydonida ham. Create/Update so'rov
 * tanasi esa alohida `habitReq` struct orqali yuboriladi va u odatiy
 * snake_case'da qoladi (HabitPayload pastda).
 *
 * docs/habit-continue.md — PausedFrom shu struct'ga qo'shilgan yangi maydon:
 * null bo'lsa habit cheksiz davom etadi, sana bo'lsa — o'sha sanadan
 * (kiritilmagan) boshlab GET /api/habits va GET /api/entries'da butunlay
 * ko'rinmay qoladi. O'tgan kunlar tarixiga ta'sir qilmaydi.
 */
export interface Habit {
  ID: number
  UserID: number
  Name: string
  Description: string | null
  ScheduledTime: string | null
  IsArchived: boolean
  PausedFrom: string | null
  CreatedAt: string
}

export interface HabitPayload {
  name: string
  description?: string | null
  scheduled_time?: string | null
}

/**
 * Habit CRUD. PUT — to'liq qayta yozadi (qisman update emas), shuning uchun
 * tahrirlash formasi joriy qiymatlarni oldindan to'ldirib yuboradi.
 */
export function useHabits() {
  const api = useApi()

  function list() {
    return api<ApiResponse<Habit[]>>('/habits')
  }

  function create(payload: HabitPayload) {
    return api<ApiResponse<Habit>>('/habits', { method: 'POST', body: payload })
  }

  function update(id: number, payload: HabitPayload) {
    return api<ApiResponse<{ updated: boolean }>>(`/habits/${id}`, { method: 'PUT', body: payload })
  }

  /** DELETE aslida arxivlaydi (IsArchived = true), tarix saqlanadi — barcha kunlar uchun. */
  function archive(id: number) {
    return api<ApiResponse<{ archived: boolean }>>(`/habits/${id}`, { method: 'DELETE' })
  }

  /**
   * "Davom ettirasizmi?" savoliga "Yo'q" javobi. `date`dan keyingi kunlarda
   * habit butunlay ko'rinmay qoladi, `date` va undan oldingi kunlar
   * o'zgarmaydi. Qayta yoqish (unpause) hozircha backendda yo'q.
   */
  function pause(id: number, date: string) {
    return api<ApiResponse<{ paused: boolean }>>(`/habits/${id}/pause`, {
      method: 'POST',
      body: { date }
    })
  }

  return { list, create, update, archive, pause }
}
