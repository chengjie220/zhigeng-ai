import request from './request'
import { mockNotices } from './mock/data'
import type {
  AiStatus,
  DeadlineFilter,
  NoticeDetail,
  NoticeItem,
  NoticeListResp,
  NoticeQuery,
} from '@/types/notice'
import { getDeadlineStatus } from '@/utils/date'

/** 默认使用 Mock；联调真实后端时在 .env 中设置 VITE_USE_MOCK=false */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** 模拟网络延迟，让加载态可见 */
function delay<T>(data: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function toListItem(d: NoticeDetail): NoticeItem {
  return {
    id: d.id,
    title: d.title,
    source_id: d.source_id,
    source_name: d.source_name,
    category: d.category,
    published_at: d.published_at,
    deadline_date: d.deadline_date,
    deadline_time: d.deadline_time,
    summary: d.summary,
    ai_status: d.ai_status,
    original_url: d.original_url,
  }
}

/** Mock 模式下按查询条件过滤 */
function filterMock(query: NoticeQuery): NoticeItem[] {
  let list = mockNotices.map(toListItem)

  if (query.q) {
    const kw = query.q.trim().toLowerCase()
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(kw) ||
        n.summary.toLowerCase().includes(kw) ||
        n.category.includes(kw),
    )
  }
  if (query.category) {
    list = list.filter((n) => n.category === query.category)
  }
  if (query.source_id) {
    list = list.filter((n) => n.source_id === query.source_id)
  }
  if (query.source_ids && query.source_ids.length > 0) {
    list = list.filter((n) => query.source_ids!.includes(n.source_id))
  }
  if (query.deadline_status && query.deadline_status !== 'all') {
    list = list.filter((n) => getDeadlineStatus(n.deadline_date) === query.deadline_status)
  }
  return list
}

/** 获取通知列表 */
export async function getNotices(query: NoticeQuery = {}): Promise<NoticeListResp> {
  if (USE_MOCK) {
    const all = filterMock(query)
    const page = query.page ?? 1
    const pageSize = query.page_size ?? 10
    const start = (page - 1) * pageSize
    return delay({
      items: all.slice(start, start + pageSize),
      total: all.length,
      page,
      page_size: pageSize,
    })
  }
  const params: Record<string, string | number> = {}
  if (query.q) params.q = query.q
  if (query.category) params.category = query.category
  if (query.source_id) params.source_id = query.source_id
  if (query.deadline_status && query.deadline_status !== 'all') {
    params.deadline_status = query.deadline_status
  }
  params.page = query.page ?? 1
  params.page_size = query.page_size ?? 10
  return (await request.get('/notices', { params })) as NoticeListResp
}

/** 获取通知详情 */
export async function getNoticeDetail(id: number): Promise<NoticeDetail> {
  if (USE_MOCK) {
    const found = mockNotices.find((n) => n.id === id)
    if (!found) throw new Error('NOT_FOUND')
    return delay(found)
  }
  return (await request.get(`/notices/${id}`)) as NoticeDetail
}

/** 获取已验证的字段证据 */
export async function getNoticeEvidence(id: number): Promise<Record<string, string>> {
  if (USE_MOCK) {
    const found = mockNotices.find((n) => n.id === id)
    if (!found) throw new Error('NOT_FOUND')
    return delay(found.evidence)
  }
  return (await request.get(`/notices/${id}/evidence`)) as Record<string, string>
}

/** 通知统计（关于页展示用） */
export async function getStats(): Promise<{
  total: number
  by_category: Record<string, number>
  ai_done: number
}> {
  if (USE_MOCK) {
    const byCategory: Record<string, number> = {}
    let aiDone = 0
    for (const n of mockNotices) {
      byCategory[n.category] = (byCategory[n.category] ?? 0) + 1
      if (n.ai_status === 'done') aiDone += 1
    }
    return delay({ total: mockNotices.length, by_category: byCategory, ai_done: aiDone })
  }
  return (await request.get('/stats')) as {
    total: number
    by_category: Record<string, number>
    ai_done: number
  }
}

export type { AiStatus, DeadlineFilter }
