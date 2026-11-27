import type { NoticeItem } from '@/types/notice'
import { daysUntil, formatDate } from './date'

/** 首页「近期日程」的一个时间桶 */
export interface TimeBucket {
  key: string
  label: string
  hint: string
  tone: 'danger' | 'warn' | 'info' | 'neutral'
  items: NoticeItem[]
}

function byDeadlineAsc(a: NoticeItem, b: NoticeItem): number {
  return (a.deadline_date ?? '').localeCompare(b.deadline_date ?? '')
}

/**
 * 按截止时间把通知分桶（纯函数，便于单元测试）：
 *   今天截止 / 3 天内 / 本周内 / 下周及以后 / 无截止日期
 * 已截止的不上首页时间板（首页聚焦还能行动的机会）。
 * 每桶内按截止日期升序，空桶不返回。
 */
export function bucketByDeadline(notices: NoticeItem[], limit = 5): TimeBucket[] {
  const today: NoticeItem[] = []
  const soon: NoticeItem[] = []
  const thisWeek: NoticeItem[] = []
  const later: NoticeItem[] = []
  const none: NoticeItem[] = []

  for (const n of notices) {
    const days = daysUntil(n.deadline_date)
    if (days === null) none.push(n)
    else if (days < 0) continue
    else if (days === 0) today.push(n)
    else if (days <= 3) soon.push(n)
    else if (days <= 7) thisWeek.push(n)
    else later.push(n)
  }

  const defs: TimeBucket[] = [
    { key: 'today', label: '今天截止', hint: '过期不候', tone: 'danger', items: today.sort(byDeadlineAsc) },
    { key: 'soon', label: '3 天内', hint: '近几天抓紧', tone: 'danger', items: soon.sort(byDeadlineAsc) },
    { key: 'week', label: '本周内', hint: '4–7 天', tone: 'warn', items: thisWeek.sort(byDeadlineAsc) },
    { key: 'later', label: '下周及以后', hint: '还有几周', tone: 'neutral', items: later.sort(byDeadlineAsc) },
    { key: 'none', label: '无截止日期', hint: '可随时了解', tone: 'info', items: none },
  ]

  return defs
    .filter((b) => b.items.length > 0)
    .map((b) => ({ ...b, items: b.items.slice(0, limit) }))
}

/** 桶内条目的日期文案：今天/N天后/M月D日 */
export function bucketDateLabel(dateStr: string | null): string {
  const days = daysUntil(dateStr)
  if (days === null) return '待核实'
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days <= 3) return `${days} 天后`
  return formatDate(dateStr)
}
