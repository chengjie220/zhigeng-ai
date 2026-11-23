import type { NoticeItem, NoticeSort } from '@/types/notice'
import { daysUntil } from './date'

/**
 * 列表排序（纯函数，便于单元测试）。
 *
 * 「最近截止优先」的分组规则：
 *   0 组 = 尚未截止，按剩余天数升序（越快到期的越靠前）
 *   1 组 = 已截止，按「刚过期」在前（-1 天在 -10 天之前）
 *   2 组 = 截止日期未知，永远排在最后
 * 同组同天数时，用发布时间倒序兜底，保证顺序稳定。
 */
function deadlineRank(dateStr: string | null): { group: number; key: number } {
  const days = daysUntil(dateStr)
  if (days === null) return { group: 2, key: 0 }
  if (days < 0) return { group: 1, key: -days }
  return { group: 0, key: days }
}

function byPublishedDesc(a: NoticeItem, b: NoticeItem): number {
  return (b.published_at ?? '').localeCompare(a.published_at ?? '')
}

export function sortNotices<T extends NoticeItem>(list: T[], sort: NoticeSort = 'deadline'): T[] {
  const next = [...list]
  if (sort === 'published') {
    return next.sort(byPublishedDesc)
  }
  return next.sort((a, b) => {
    const ra = deadlineRank(a.deadline_date)
    const rb = deadlineRank(b.deadline_date)
    if (ra.group !== rb.group) return ra.group - rb.group
    if (ra.key !== rb.key) return ra.key - rb.key
    return byPublishedDesc(a, b)
  })
}
