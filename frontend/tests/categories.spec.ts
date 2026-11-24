import { describe, expect, it } from 'vitest'
import type { NoticeDetail } from '@/types/notice'
import {
  CATEGORIES,
  buildCategoryFields,
  getCategorySpec,
  resolveFieldValue,
} from '@/config/categories'
import { mockProbeSource, mockSourceSearchResults } from '@/api/mock/data'
import { probeSourceUrl, searchSourceSites } from '@/api/sources'

function detail(extra: Record<string, string | string[]>): NoticeDetail {
  return {
    id: 1,
    title: '测试通知',
    source_id: 1,
    source_name: '测试来源',
    category: '公示',
    published_at: '2026-11-20',
    deadline_date: null,
    deadline_time: null,
    summary: '',
    ai_status: 'done',
    original_url: '',
    audience: ['全校学生'],
    requirements: [],
    application_method: null,
    evidence: {},
    attachments: [],
    body_text: '',
    extra,
  }
}

describe('分类专属字段', () => {
  it('五类齐全，且每类都有自己的字段清单', () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual(['竞赛', '公示', '讲座', '活动', '实践'])
    for (const spec of CATEGORIES) expect(spec.fields.length).toBeGreaterThanOrEqual(4)
  })

  it('公示类优先展示公示对象与异议反馈，而不是报名方式', () => {
    const fields = buildCategoryFields(
      detail({ '公示对象': '拟获奖学生', '异议反馈': '发送邮件反馈', '公示单位': '学生处' }),
      '公示',
      3,
    )
    expect(fields.map((f) => f.label)).toEqual(['公示对象', '异议反馈', '发布单位'])
  })

  it('讲座类展示主讲人和地点', () => {
    const fields = buildCategoryFields(
      detail({ '主讲人': '张教授', '地点': '学术报告厅' }),
      '讲座',
      3,
    )
    expect(fields).toEqual([
      { label: '讲座地点', value: '学术报告厅' },
      { label: '主讲人', value: '张教授' },
    ])
  })

  it('字段无依据时不出现在卡片上', () => {
    expect(buildCategoryFields(detail({}), '公示', 3)).toEqual([])
  })

  it('未知分类安全降级到活动类', () => {
    expect(getCategorySpec('未知').key).toBe('活动')
  })

  it('数组字段用顿号连接', () => {
    expect(resolveFieldValue({ ...detail({}), audience: ['本科生', '研究生'] }, 'audience')).toBe(
      '本科生、研究生',
    )
  })
})

describe('信息源发现（Mock）', () => {
  it('关键词搜索返回网站候选', async () => {
    const results = await searchSourceSites('教务处')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toHaveProperty('domain')
  })

  it('探测合法网址给出站点名与样例标题', async () => {
    const result = await probeSourceUrl('https://jwc.cdu.edu.cn/index/tzgg.htm')
    expect(result.ok).toBe(true)
    expect(result.samples.length).toBeGreaterThan(0)
    expect(result.name).toContain('jwc')
  })

  it('非法网址明确提示，不假装探测成功', async () => {
    const result = mockProbeSource('not-a-url')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('http')
  })

  it('搜索结果带域名，便于用户判断站点归属', () => {
    for (const item of mockSourceSearchResults) {
      expect(item.domain).toMatch(/\.edu\.cn$/)
    }
  })
})
