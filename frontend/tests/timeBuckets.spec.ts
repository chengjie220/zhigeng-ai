import { describe, expect, it } from 'vitest'
import type { NoticeItem } from '@/types/notice'
import { bucketByDeadline, bucketDateLabel } from '@/utils/timeBuckets'

function notice(id: number, deadline: string | null): NoticeItem {
  return {
    id,
    title: `通知${id}`,
    source_id: 1,
    source_name: '测试源',
    category: '竞赛',
    published_at: '2026-11-20',
    deadline_date: deadline,
    deadline_time: null,
    summary: '',
    ai_status: 'done',
    original_url: `https://example.com/${id}`,
  }
}

function daysFromToday(delta: number): string {
  const d = new Date()
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('bucketByDeadline', () => {
  it('按截止时间分入正确的桶', () => {
    const buckets = bucketByDeadline([
      notice(1, daysFromToday(0)),
      notice(2, daysFromToday(2)),
      notice(3, daysFromToday(5)),
      notice(4, daysFromToday(20)),
      notice(5, null),
    ])
    const keys = buckets.map((b) => b.key)
    expect(keys).toEqual(['today', 'soon', 'week', 'later', 'none'])
    expect(buckets[0].items.map((n) => n.id)).toEqual([1])
    expect(buckets[1].items.map((n) => n.id)).toEqual([2])
  })

  it('已截止的不上时间板', () => {
    const buckets = bucketByDeadline([notice(1, daysFromToday(-3)), notice(2, null)])
    expect(buckets.map((b) => b.key)).toEqual(['none'])
  })

  it('空桶不返回', () => {
    const buckets = bucketByDeadline([notice(1, daysFromToday(20))])
    expect(buckets.map((b) => b.key)).toEqual(['later'])
  })

  it('桶内按截止日期升序，超出 limit 截断', () => {
    const buckets = bucketByDeadline(
      [
        notice(3, daysFromToday(3)),
        notice(1, daysFromToday(1)),
        notice(2, daysFromToday(2)),
        notice(4, daysFromToday(1) + ''),
      ],
      2,
    )
    const soon = buckets.find((b) => b.key === 'soon')!
    expect(soon.items.length).toBe(2)
    expect(soon.items[0].id).toBe(1)
  })
})

describe('bucketDateLabel', () => {
  it('给出友好日期文案', () => {
    expect(bucketDateLabel(daysFromToday(0))).toBe('今天')
    expect(bucketDateLabel(daysFromToday(1))).toBe('明天')
    expect(bucketDateLabel(daysFromToday(2))).toBe('2 天后')
    expect(bucketDateLabel(null)).toBe('待核实')
    expect(bucketDateLabel(daysFromToday(10))).toMatch(/月.*日/)
  })
})
