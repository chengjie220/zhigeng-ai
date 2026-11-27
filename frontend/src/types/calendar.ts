/** 周视图日历的数据结构（对应 GET /api/v1/calendar） */

export type CalendarEventKind = 'deadline' | 'event'

export interface CalendarEvent {
  date: string
  notice_id: number
  title: string
  category: string
  source_name: string
  kind: CalendarEventKind
  time: string | null
  /** deadline → 「截止」；event → 「考试时间」「活动时间」等原文用词 */
  label: string
}

export interface CalendarResp {
  start: string
  end: string
  events: CalendarEvent[]
  notice_count: number
  disclaimer: string
}

/** 周视图里的一天 */
export interface WeekDay {
  date: string
  weekday: string
  dayNum: number
  isToday: boolean
  isPast: boolean
  events: CalendarEvent[]
}
