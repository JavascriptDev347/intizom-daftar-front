/**
 * internal/domain/entry.go — CalendarDay struct'ida ham `json` teg yo'q,
 * shuning uchun PascalCase qaytadi (docs/habit-crud.md'dagi Habit qoidasi
 * bilan bir xil sabab).
 */
export interface CalendarDay {
  Date: string
  Total: number
  Done: number
  Missed: number
  WithJazo: number
}

export function useCalendarApi() {
  const api = useApi()

  function get(from: string, to: string) {
    return api<ApiResponse<CalendarDay[]>>('/calendar', { query: { from, to } })
  }

  return { get }
}
