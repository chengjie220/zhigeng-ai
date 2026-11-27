import request from './request'
import { USE_MOCK } from './notices'
import { mockNotices } from './mock/data'
import type { CalendarEvent, CalendarResp } from '@/types/calendar'
import { startOfWeek, toISODate } from '@/utils/weekGrid'

/** Mock 模式：用示例数据的截止日铺出本周（超出本周的示例数据会被过滤） */
function mockWeek(anchor?: string): CalendarResp {
  const monday = startOfWeek(anchor ? new Date(anchor) : new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const start = toISODate(monday)
  const end = toISODate(sunday)

  const events: CalendarEvent[] = mockNotices
    .filter((n) => n.deadline_date && n.deadline_date >= start && n.deadline_date <= end)
    .map((n) => ({
      date: n.deadline_date!,
      notice_id: n.id,
      title: n.title,
      category: n.category,
      source_name: n.source_name,
      kind: 'deadline' as const,
      time: n.deadline_time,
      label: '截止',
    }))

  return {
    start,
    end,
    events,
    notice_count: new Set(events.map((e) => e.notice_id)).size,
    disclaimer: '示例数据模式：仅展示示例通知的截止日期。',
  }
}

/** 拉取某一周的日历事件；start 传该周任意一天即可 */
export async function getWeekEvents(start?: string): Promise<CalendarResp> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200))
    return mockWeek(start)
  }
  return request.get<unknown, CalendarResp>('/calendar', {
    params: start ? { start } : {},
  })
}
