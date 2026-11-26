import { describe, expect, it } from 'vitest'
import type { NoticeItem } from '@/types/notice'
import {
  buildDynamicCatalog,
  defaultFocusKeys,
  inferCategoryKey,
} from '@/utils/dynamicCategories'

function notice(id: number, category: string, title: string, summary = '', urgent = false): NoticeItem {
  return {
    id,
    title,
    source_id: 5,
    source_name: id % 2 ? '图书馆' : '教务处',
    category,
    published_at: '2026-11-25',
    deadline_date: urgent ? '2026-11-26' : null,
    deadline_time: null,
    summary,
    ai_status: 'done',
    original_url: '',
  }
}

describe('动态类别目录', () => {
  it('标题里的关键词能把未知类别归入既有类别', () => {
    expect(inferCategoryKey(notice(1, '读者服务', '数据库检索培训讲座', '面向师生的讲座'))).toBe('讲座')
    expect(inferCategoryKey(notice(2, '馆务公告', '调整阅览室开放时间', '设备维护'))).toBeNull()
  })

  it('没有通知的类别不出现在目录里', () => {
    const catalog = buildDynamicCatalog([notice(1, '竞赛', '数学建模竞赛')])
    expect(catalog.categories.map((c) => c.key)).toEqual(['竞赛'])
    expect(catalog.groups.map((g) => g.key)).toEqual(['成长机会'])
    expect(catalog.categories.some((c) => c.key === '公示')).toBe(false)
  })

  it('未知内容按关键词重新归类，无法匹配的进入新发现组并聚合来源', () => {
    const catalog = buildDynamicCatalog([
      notice(1, '读者服务', '数据库检索培训讲座', '数据库培训讲座'),
      notice(2, '馆务公告', '调整阅览室开放时间', '设备维护'),
      notice(3, '馆务公告', '自习室座位管理规定'),
    ], new Set([3]))
    expect(catalog.categoryOf.get(1)).toBe('讲座')
    expect(catalog.categoryOf.get(2)).toBe('馆务公告')
    expect(catalog.reclassified).toBe(1)
    const discovery = catalog.groups.find((g) => g.key === '新发现')
    expect(discovery?.categories.map((c) => c.key)).toEqual(['馆务公告'])
    expect(discovery?.categories[0].total).toBe(2)
    expect(discovery?.categories[0].urgent).toBe(1)
    expect(new Set(discovery?.categories[0].sources)).toEqual(new Set(['图书馆', '教务处']))
  })

  it('首次使用默认订阅最需要处理的三类', () => {
    const catalog = buildDynamicCatalog([
      notice(1, '竞赛', '竞赛通知', '', false),
      notice(2, '考试安排', '四六级考试'),
      notice(3, '公示', '名单公示'),
      notice(4, '讲座', '学术讲座'),
    ], new Set([2, 3]))
    expect(new Set(defaultFocusKeys(catalog.categories, 2))).toEqual(new Set(['考试安排', '公示']))
    expect(defaultFocusKeys(catalog.categories, 3)).toHaveLength(3)
  })
})
