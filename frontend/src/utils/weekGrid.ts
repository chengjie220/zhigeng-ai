import type { CalendarEvent, WeekDay } from '@/types/calendar'

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 本地日期（不用 toISOString，避免时区把日期推前一天） */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 该日期所在周的周一（周一为一周起点） */
export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7 // 周日=0 → 6
  d.setDate(d.getDate() - offset)
  return d
}

/** 相对本周偏移 n 周后的周一 */
export function shiftWeek(monday: Date, n: number): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + n * 7)
  return d
}

/** 生成一周 7 天，并把事件挂到对应日期上 */
export function buildWeekDays(
  monday: Date,
  events: CalendarEvent[],
  today: Date = new Date(),
): WeekDay[] {
  const todayISO = toISODate(today)
  const byDate = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, [])
    byDate.get(e.date)!.push(e)
  }

  return WEEKDAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    const iso = toISODate(d)
    const list = (byDate.get(iso) ?? []).slice().sort(compareEvent)
    return {
      date: iso,
      weekday: label,
      dayNum: d.getDate(),
      isToday: iso === todayISO,
      isPast: iso < todayISO,
      events: list,
    }
  })
}

/** 同一天内：整日事件（无具体时间，如「截止」）在前，再按时间；同时间截止优先于活动 */
function compareEvent(a: CalendarEvent, b: CalendarEvent): number {
  const ta = a.time ?? ''
  const tb = b.time ?? ''
  if (ta !== tb) return ta < tb ? -1 : 1
  if (a.kind !== b.kind) return a.kind === 'deadline' ? -1 : 1
  return a.title.localeCompare(b.title, 'zh-CN')
}

/** 周标题：11月24日 – 11月30日 */
export function weekRangeLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
  return `${fmt(monday)} – ${fmt(sunday)}`
}

/** 该周属于今年的第几周，用于「本周/下周」判定文案 */
export function isSameWeek(a: Date, b: Date): boolean {
  return toISODate(startOfWeek(a)) === toISODate(startOfWeek(b))
}

export { parseISO }
