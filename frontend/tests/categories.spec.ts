import { describe, expect, it } from 'vitest'
import type { NoticeDetail } from '@/types/notice'
import {
  CATEGORIES,
  GROUPS,
  buildCategoryFields,
  getCategorySpec,
  getGroupCategories,
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
  it('十四类齐全，且每类都有自己的字段清单', () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual([
      '竞赛', '创新创业', '升学就业', '就业指导', '实践', '活动', '讲座',
      '考试安排', '选课成绩', '学籍毕业', '党团事务', '公示', '招投标', '奖惩处分',
    ])
    for (const spec of CATEGORIES) expect(spec.fields.length).toBeGreaterThanOrEqual(4)
  })

  it('按真实教务内容分成三组，每组类别完整', () => {
    expect(GROUPS.map((g) => g.key)).toEqual(['成长机会', '学业事务', '公告信息'])
    expect(getGroupCategories('成长机会').map((c) => c.key)).toEqual([
      '竞赛', '创新创业', '升学就业', '就业指导', '实践', '活动', '讲座',
    ])
    expect(getGroupCategories('学业事务').map((c) => c.key)).toEqual([
      '考试安排', '选课成绩', '学籍毕业', '党团事务',
    ])
    expect(getGroupCategories('公告信息').map((c) => c.key)).toEqual([
      '公示', '招投标', '奖惩处分',
    ])
    for (const spec of CATEGORIES) {
      expect(GROUPS.some((g) => g.key === spec.group), `${spec.key} 未归入任何组别`).toBe(true)
    }
  })

  it('考试安排看时间与准考证，选课成绩看平台与考核时间', () => {
    const exam = buildCategoryFields(
      detail({ '考试时间': '11 月 28 日', '考试地点': '十教', '准考证打印': '11 月 27 日起' }),
      '考试安排',
      4,
    )
    expect(exam.map((f) => f.label)).toEqual(['考试时间', '考试地点', '准考证打印', '参考对象'])
    const course = buildCategoryFields(
      detail({ '办理事项': '完成线上学习', '平台入口': '智慧树', '考核时间': '12 月 21 日' }),
      '选课成绩',
      4,
    )
    expect(course.map((f) => f.label)).toEqual(['办理事项', '平台入口', '考核时间', '适用对象'])
  })

  it('升学就业类提取考试时间、招录单位和准考证，而不是赛事级别', () => {
    const fields = buildCategoryFields(
      detail({
        '考试时间': '12 月 19 日至 20 日',
        '招录单位': '成都大学研究生院',
        '准考证打印': '12 月 12 日起下载',
      }),
      '升学就业',
      4,
    )
    expect(fields.map((f) => f.label)).toEqual([
      '考试时间', '招录/招生单位', '准考证打印', '报考对象',
    ])
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
