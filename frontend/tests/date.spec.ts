import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { daysUntil, deadlineLabel, formatDate, formatDateFull, getDeadlineStatus } from '@/utils/date'

/** 把「今天」固定在 2026-11-23，避免测试结果随真实日期漂移 */
const TODAY = new Date(2026, 10, 23, 10, 30, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('daysUntil', () => {
  it('无日期时返回 null', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('今天截止返回 0', () => {
    expect(daysUntil('2026-11-23')).toBe(0)
  })

  it('未来日期返回正数', () => {
    expect(daysUntil('2026-11-30')).toBe(7)
    expect(daysUntil('2026-12-10')).toBe(17)
  })

  it('过去日期返回负数', () => {
    expect(daysUntil('2026-11-20')).toBe(-3)
  })
})

describe('getDeadlineStatus', () => {
  it('截止日期缺失归为 unknown', () => {
    expect(getDeadlineStatus(null)).toBe('unknown')
  })

  it('今天截止与 7 天内都算 urgent', () => {
    expect(getDeadlineStatus('2026-11-23')).toBe('urgent')
    expect(getDeadlineStatus('2026-11-30')).toBe('urgent')
  })

  it('超过 7 天算 upcoming', () => {
    expect(getDeadlineStatus('2026-12-01')).toBe('upcoming')
  })

  it('已过日期算 expired', () => {
    expect(getDeadlineStatus('2026-11-22')).toBe('expired')
  })
})

describe('日期格式化', () => {
  it('formatDate 输出「M月D日」', () => {
    expect(formatDate('2026-12-05')).toBe('12月5日')
  })

  it('formatDateFull 输出完整年月日', () => {
    expect(formatDateFull('2026-12-05')).toBe('2026年12月5日')
  })

  it('空日期统一显示「待核实」', () => {
    expect(formatDate(null)).toBe('待核实')
    expect(formatDateFull(null)).toBe('待核实')
  })
})

describe('deadlineLabel', () => {
  it('今天截止文案', () => {
    expect(deadlineLabel('2026-11-23')).toBe('今天截止')
  })

  it('临近截止显示剩余天数', () => {
    expect(deadlineLabel('2026-11-28')).toBe('5天后截止')
  })

  it('已截止与未知状态文案', () => {
    expect(deadlineLabel('2026-11-01')).toBe('已截止')
    expect(deadlineLabel(null)).toBe('截止待核实')
  })
})
