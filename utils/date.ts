/** Backend har doim date-only "YYYY-MM-DD" kutadi (task.md, 3-eslatma). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Bugungi sana kaliti, mahalliy vaqt zonasida. */
export function todayKey(): string {
  return toDateKey(new Date())
}

/**
 * Backend javoblaridagi to'liq ISO timestamp'dan ("2026-07-26T00:00:00Z")
 * faqat sana qismini oladi (task.md, 3-eslatma) — Date() orqali o'tkazmaymiz,
 * chunki UTC "T00:00:00Z" mahalliy vaqt zonasida oldingi kunga siljib qolishi
 * mumkin.
 */
export function isoToDateKey(iso: string): string {
  return iso.slice(0, 10)
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function startOfMonth(dateKey: string): string {
  const [y, m] = dateKey.split('-').map(Number)
  return toDateKey(new Date(y, m - 1, 1))
}

export function endOfMonth(dateKey: string): string {
  const [y, m] = dateKey.split('-').map(Number)
  return toDateKey(new Date(y, m, 0))
}

export function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return toDateKey(new Date(y, m - 1 + months, d))
}

/** Oy taqvim to'ri uchun: dushanbadan boshlab, oldingi/keyingi oydan to'ldiruvchi kunlar bilan 6 haftalik to'r. */
export function buildMonthGrid(dateKey: string): string[] {
  const first = startOfMonth(dateKey)
  const last = endOfMonth(dateKey)
  // getDay(): 0=Yakshanba..6=Shanba -> dushanba boshlanishiga o'tkazamiz
  const [fy, fm, fd] = first.split('-').map(Number)
  const firstWeekday = (new Date(fy, fm - 1, fd).getDay() + 6) % 7
  const [ly, lm, ld] = last.split('-').map(Number)
  const lastWeekday = (new Date(ly, lm - 1, ld).getDay() + 6) % 7

  const days: string[] = []
  for (let i = firstWeekday; i > 0; i--) days.push(addDays(first, -i))
  days.push(...Array.from({ length: Number(ld) }, (_, i) => addDays(first, i)))
  for (let i = 1; i <= 6 - lastWeekday; i++) days.push(addDays(last, i))
  return days
}
