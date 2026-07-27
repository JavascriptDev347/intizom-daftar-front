/**
 * internal/service/stats_service.go — HabitStat/DashboardStats struct'larida
 * ham `json` teg yo'q, shuning uchun PascalCase qaytadi (Habit CRUD'dagi
 * qoida bilan bir xil, docs/habit-crud.md'ga qarang).
 */
export interface HabitStat {
  Habit: Habit
  DoneCount: number
  MissedCount: number
  CurrentStreak: number
}

export interface DashboardData {
  RangeFrom: string
  RangeTo: string
  TotalDone: number
  TotalMissed: number
  PerHabit: HabitStat[]
}

/** from/to berilmasa — backend oxirgi 30 kunni qaytaradi. */
export function useDashboardApi() {
  const api = useApi()

  function get(from?: string, to?: string) {
    return api<ApiResponse<DashboardData>>('/dashboard', {
      query: { from, to }
    })
  }

  return { get }
}
