import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoticeItem } from '@/types/notice'
import { sortNotices } from '@/utils/noticeSort'

function item(id: number, deadline: string | null, published: string): NoticeItem {
  return {
    id,
    title: `通知 ${id}`,
    source_id: 1,
    source_name: '测试来源',
    category: '竞赛',
    published_at: published,
    deadline_date: deadline,
    deadline_time: null,
    summary: '',
    ai_status: 'done',
    original_url: '',
  }
}

const list: NoticeItem[] = [
  item(1, '2026-12-20', '2026-11-15'),
  item(2, null, '2026-11-19'),
  item(3, '2026-11-28', '2026-11-22'),
  item(4, '2026-11-18', '2026-11-10'), // 已过期 5 天
  item(5, '2026-12-05', '2026-11-18'),
]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 23, 9, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('sortNotices', () => {
  it('默认按最近截止优先：未截止在前、已截止沉底、无截止日期最后', () => {
    expect(sortNotices(list).map((n) => n.id)).toEqual([3, 5, 1, 4, 2])
  })

  it('最新发布优先按发布时间倒序', () => {
    expect(sortNotices(list, 'published').map((n) => n.id)).toEqual([3, 2, 5, 1, 4])
  })

  it('不修改传入的数组', () => {
    const original = list.map((n) => n.id)
    sortNotices(list)
    expect(list.map((n) => n.id)).toEqual(original)
  })

  it('同一天截止时用发布时间倒序兜底，保证顺序稳定', () => {
    const sameDay = [item(7, '2026-12-01', '2026-11-10'), item(8, '2026-12-01', '2026-11-20')]
    expect(sortNotices(sameDay).map((n) => n.id)).toEqual([8, 7])
  })

  it('多条已过期通知中，刚过期的排前面', () => {
    const expired = [item(9, '2026-11-01', '2026-10-01'), item(10, '2026-11-20', '2026-11-01')]
    expect(sortNotices(expired).map((n) => n.id)).toEqual([10, 9])
  })

  it('空列表返回空列表', () => {
    expect(sortNotices([])).toEqual([])
  })
})
