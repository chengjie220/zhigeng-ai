import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getNoticeDetail, getNotices } from '@/api/notices'

/** 只伪造 Date，保留真实 setTimeout（Mock 接口有 250ms 模拟延迟） */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 23, 9, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getNotices（Mock 数据）', () => {
  it('默认按最近截止优先排序，无截止日期的排最后', async () => {
    const resp = await getNotices({ page_size: 20 })
    expect(resp.items.map((n) => n.id)).toEqual([3, 6, 2, 8, 1, 4, 7, 5])
    expect(resp.total).toBe(8)
  })

  it('sort=published 时按发布时间倒序', async () => {
    const resp = await getNotices({ sort: 'published', page_size: 20 })
    expect(resp.items.map((n) => n.id)).toEqual([3, 6, 1, 5, 2, 8, 4, 7])
  })

  it('关键词命中标题或摘要', async () => {
    const resp = await getNotices({ q: '数学建模' })
    expect(resp.items).toHaveLength(1)
    expect(resp.items[0].id).toBe(6)
  })

  it('按分类过滤', async () => {
    const resp = await getNotices({ category: '竞赛' })
    expect(resp.items.map((n) => n.id)).toEqual([8, 1, 4])
  })

  it('按订阅来源过滤（source_ids）', async () => {
    const resp = await getNotices({ source_ids: [2] })
    expect(resp.items.map((n) => n.id)).toEqual([6, 8, 1, 4])
  })

  it('按截止状态过滤：7 天内截止', async () => {
    const resp = await getNotices({ deadline_status: 'urgent' })
    expect(resp.items.map((n) => n.id)).toEqual([3])
  })

  it('按截止状态过滤：已截止', async () => {
    const resp = await getNotices({ deadline_status: 'expired' })
    expect(resp.items.map((n) => n.id)).toEqual([7])
  })

  it('分页正确切片，total 为过滤后的总数', async () => {
    const resp = await getNotices({ page: 2, page_size: 3 })
    expect(resp.items.map((n) => n.id)).toEqual([8, 1, 4])
    expect(resp.total).toBe(8)
    expect(resp.page).toBe(2)
    expect(resp.page_size).toBe(3)
  })

  it('筛选与分页组合：无结果时返回空列表而不是报错', async () => {
    const resp = await getNotices({ q: '不存在的关键词', page_size: 10 })
    expect(resp.items).toEqual([])
    expect(resp.total).toBe(0)
  })
})

describe('getNoticeDetail（Mock 数据）', () => {
  it('返回完整详情字段', async () => {
    const detail = await getNoticeDetail(1)
    expect(detail.title).toContain('创新创业大赛')
    expect(detail.audience.length).toBeGreaterThan(0)
    expect(detail.body_text.length).toBeGreaterThan(0)
  })

  it('不存在的 id 抛出 NOT_FOUND', async () => {
    await expect(getNoticeDetail(999)).rejects.toThrow('NOT_FOUND')
  })
})
