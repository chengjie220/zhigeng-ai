import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoticeDetail, NoticeItem } from '@/types/notice'
import {
  ACTION_PLACEHOLDER,
  briefHeadline,
  buildBriefActions,
  countRecentNotices,
  pickActionText,
  pickAudienceText,
} from '@/utils/brief'

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

function detail(overrides: Partial<NoticeDetail> = {}): NoticeDetail {
  return {
    ...item(1, '2026-11-25', '2026-11-20'),
    audience: [],
    requirements: [],
    application_method: null,
    evidence: {},
    attachments: [],
    body_text: '',
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 23, 9, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('简报行动文案', () => {
  it('优先展示报名方式', () => {
    expect(pickActionText(detail({ application_method: '发送邮件报名' }))).toBe('发送邮件报名')
  })

  it('没有报名方式时退而展示材料要求', () => {
    expect(pickActionText(detail({ requirements: ['提交申报书', '附成绩单'] }))).toBe(
      '材料要求：提交申报书；附成绩单',
    )
  })

  it('字段都缺失时返回待核实，绝不编造', () => {
    expect(pickActionText(detail())).toBe(ACTION_PLACEHOLDER)
    expect(pickActionText(null)).toBe(ACTION_PLACEHOLDER)
  })

  it('公示类优先展示异议反馈，而不是报名方式', () => {
    expect(
      pickActionText(detail({ extra: { '异议反馈': '实名发送至邮箱' } }), '公示'),
    ).toBe('实名发送至邮箱')
    expect(pickActionText(detail(), '公示')).toBe('异议反馈方式待核实，请查看原文')
  })

  it('升学就业类优先展示报名方式，其次提示准考证打印', () => {
    expect(pickActionText(detail({ application_method: '研招网网上报名' }), '升学就业')).toBe(
      '研招网网上报名',
    )
    expect(
      pickActionText(detail({ extra: { '准考证打印': '12 月 12 日起下载' } }), '升学就业'),
    ).toBe('准考证：12 月 12 日起下载')
    expect(pickActionText(detail(), '升学就业')).toBe('报名安排待核实，请查看原文')
  })

  it('参与对象最多展示前三项', () => {
    expect(
      pickAudienceText(detail({ audience: ['本科生', '研究生', '教师', '校友'] })),
    ).toBe('本科生、研究生、教师')
  })

  it('参与对象缺失时如实标注', () => {
    expect(pickAudienceText(null)).toBe('参与对象待核实')
  })
})

describe('简报统计', () => {
  it('只统计最近 7 天发布的通知（含今天）', () => {
    const items = [
      item(1, null, '2026-11-23'),
      item(2, null, '2026-11-17'),
      item(3, null, '2026-11-16'),
      item(4, null, '2026-11-01'),
    ]
    expect(countRecentNotices(items)).toBe(2)
  })

  it('标题按临近截止数量如实生成', () => {
    expect(briefHeadline(3)).toBe('有 3 件事快截止了')
    expect(briefHeadline(0)).toBe('这周没有临近截止的校园机会')
    expect(briefHeadline(2, '竞赛')).toBe('竞赛类有 2 件事快截止了')
  })
})

describe('buildBriefActions', () => {
  const list = [
    item(1, '2026-11-25', '2026-11-20'),
    item(2, '2026-11-18', '2026-11-10'),
    item(3, '2026-12-20', '2026-11-21'),
    item(4, '2026-11-24', '2026-11-22'),
  ]

  it('剔除已截止和 7 天以外的，只保留还能行动的机会', () => {
    const actions = buildBriefActions(list, new Map(), 5)
    expect(actions.map((a) => a.notice.id)).toEqual([1, 4])
  })

  it('默认最多取三条，防止简报又变成新列表', () => {
    const many = [1, 2, 3, 4, 5].map((id) => item(id, '2026-11-25', '2026-11-20'))
    expect(buildBriefActions(many, new Map()).length).toBe(3)
  })

  it('把详情字段并入行动卡，详情缺失时降级为待核实', () => {
    const details = new Map<number, NoticeDetail>([
      [1, detail({ application_method: '线上报名', audience: ['全校学生'] })],
    ])
    const actions = buildBriefActions(list, details, 5)
    expect(actions[0].actionText).toBe('线上报名')
    expect(actions[0].audienceText).toBe('全校学生')
    expect(actions[1].actionText).toBe(ACTION_PLACEHOLDER)
  })

  it('倒计时天数与截止日期一致', () => {
    const actions = buildBriefActions(list, new Map(), 5)
    expect(actions[0].daysLeft).toBe(2)
  })
})
