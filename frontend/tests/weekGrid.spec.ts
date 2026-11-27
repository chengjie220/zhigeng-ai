import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/types/calendar'
import {
  buildWeekDays,
  isSameWeek,
  shiftWeek,
  startOfWeek,
  toISODate,
  weekRangeLabel,
} from '@/utils/weekGrid'

function event(date: string, over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    date,
    notice_id: 1,
    title: '通知',
    category: '竞赛',
    source_name: '测试源',
    kind: 'deadline',
    time: null,
    label: '截止',
    ...over,
  }
}

describe('weekGrid', () => {
  it('toISODate 用本地日期，不会因时区推前一天', () => {
    expect(toISODate(new Date(2026, 10, 27))).toBe('2026-11-27')
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('startOfWeek 把周日也算进当周（而不是下一周）', () => {
    // 2026-11-27 是周五，所在周周一是 11-23
    expect(toISODate(startOfWeek(new Date(2026, 10, 27)))).toBe('2026-11-23')
    // 2026-11-29 是周日，仍属于 11-23 这一周
    expect(toISODate(startOfWeek(new Date(2026, 10, 29)))).toBe('2026-11-23')
    // 周一本身
    expect(toISODate(startOfWeek(new Date(2026, 10, 23)))).toBe('2026-11-23')
  })

  it('buildWeekDays 固定产出周一至周日 7 天', () => {
    const monday = new Date(2026, 10, 23)
    const days = buildWeekDays(monday, [], new Date(2026, 10, 27))
    expect(days).toHaveLength(7)
    expect(days[0].weekday).toBe('周一')
    expect(days[6].weekday).toBe('周日')
    expect(days[0].date).toBe('2026-11-23')
    expect(days[6].date).toBe('2026-11-29')
  })

  it('事件挂到对应日期，并标记今天与过去', () => {
    const monday = new Date(2026, 10, 23)
    const days = buildWeekDays(
      monday,
      [event('2026-11-25'), event('2026-11-27'), event('2026-12-01')],
      new Date(2026, 10, 27),
    )
    expect(days[0].events).toHaveLength(0)
    expect(days[2].events).toHaveLength(1)
    const today = days.find((d) => d.isToday)!
    expect(today.date).toBe('2026-11-27')
    expect(today.events).toHaveLength(1)
    expect(days[0].isPast).toBe(true)
    expect(days[6].isPast).toBe(false)
    // 不在本周的事件不会被挂上
    expect(days.flatMap((d) => d.events)).toHaveLength(2)
  })

  it('同一天内整日事件在前，再按时间排', () => {
    const days = buildWeekDays(
      new Date(2026, 10, 23),
      [
        event('2026-11-25', { notice_id: 1, kind: 'event', time: '09:00', label: '考试时间' }),
        event('2026-11-25', { notice_id: 2, kind: 'deadline', time: null }),
        event('2026-11-25', { notice_id: 3, kind: 'deadline', time: '17:00' }),
      ],
      new Date(2026, 10, 23),
    )
    const list = days[2].events
    // 2=无具体时间的截止（整日）→ 1=09:00 → 3=17:00
    expect(list.map((e) => e.notice_id)).toEqual([2, 1, 3])
  })

  it('shiftWeek 与 weekRangeLabel', () => {
    const monday = new Date(2026, 10, 23)
    expect(toISODate(shiftWeek(monday, 1))).toBe('2026-11-30')
    expect(toISODate(shiftWeek(monday, -1))).toBe('2026-11-16')
    expect(weekRangeLabel(monday)).toBe('11月23日 – 11月29日')
  })

  it('isSameWeek 判定当前周', () => {
    expect(isSameWeek(new Date(2026, 10, 23), new Date(2026, 10, 29))).toBe(true)
    expect(isSameWeek(new Date(2026, 10, 23), new Date(2026, 10, 30))).toBe(false)
  })
})
