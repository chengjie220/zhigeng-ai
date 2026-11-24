import type { NoticeDetail } from '@/types/notice'

/** 校园通知五大类 */
export type CategoryKey = '竞赛' | '公示' | '讲座' | '活动' | '实践'

export interface CategoryField {
  /** 字段路径：基础字段或 extra.<名称> */
  key: string
  label: string
  type: 'text' | 'date' | 'list'
}

export interface CategorySpec {
  key: CategoryKey
  description: string
  /** 该类在正文里的识别关键词，后端规则提取使用同一份约定 */
  cues: string[]
  /** 该类最值得看的字段，顺序即展示优先级 */
  fields: CategoryField[]
}

/** 每一类看的东西不同，提取与展示的字段也不同 */
export const CATEGORIES: CategorySpec[] = [
  {
    key: '竞赛',
    description: '学科竞赛、创新创业大赛、校内选拔',
    cues: ['竞赛', '比赛', '大赛', '选拔赛', '挑战赛', '评比', '评选'],
    fields: [
      { key: 'deadline_date', label: '报名截止', type: 'date' },
      { key: 'application_method', label: '报名方式', type: 'text' },
      { key: 'audience', label: '参赛对象', type: 'list' },
      { key: 'extra.级别', label: '赛事级别', type: 'text' },
      { key: 'extra.团队规模', label: '团队规模', type: 'text' },
      { key: 'requirements', label: '所需材料', type: 'list' },
    ],
  },
  {
    key: '公示',
    description: '名单公示、结果公示、奖学金公示',
    cues: ['公示', '拟获奖', '拟推荐', '名单', '异议', '公示期'],
    fields: [
      { key: 'deadline_date', label: '公示期至', type: 'date' },
      { key: 'extra.公示对象', label: '公示对象', type: 'text' },
      { key: 'extra.异议反馈', label: '异议反馈', type: 'text' },
      { key: 'extra.公示单位', label: '发布单位', type: 'text' },
      { key: 'requirements', label: '相关材料', type: 'list' },
    ],
  },
  {
    key: '讲座',
    description: '学术报告、专家讲座、培训分享',
    cues: ['讲座', '报告会', '论坛', '培训', '分享会', '沙龙', '主讲'],
    fields: [
      { key: 'extra.时间', label: '讲座时间', type: 'text' },
      { key: 'extra.地点', label: '讲座地点', type: 'text' },
      { key: 'extra.主讲人', label: '主讲人', type: 'text' },
      { key: 'extra.主办单位', label: '主办单位', type: 'text' },
      { key: 'application_method', label: '参与方式', type: 'text' },
    ],
  },
  {
    key: '活动',
    description: '校园文化活动、征集、演出与展会',
    cues: ['活动', '征集', '晚会', '音乐会', '文化节', '展览', '运动会'],
    fields: [
      { key: 'deadline_date', label: '报名截止', type: 'date' },
      { key: 'extra.时间地点', label: '时间地点', type: 'text' },
      { key: 'audience', label: '参与对象', type: 'list' },
      { key: 'application_method', label: '报名方式', type: 'text' },
      { key: 'extra.主办单位', label: '主办单位', type: 'text' },
    ],
  },
  {
    key: '实践',
    description: '社会实践、志愿服务、实习与支教',
    cues: ['社会实践', '志愿', '三下乡', '支教', '服务队', '实习', '实践活动'],
    fields: [
      { key: 'deadline_date', label: '报名截止', type: 'date' },
      { key: 'extra.实践地点', label: '实践地点', type: 'text' },
      { key: 'audience', label: '招募对象', type: 'list' },
      { key: 'application_method', label: '报名方式', type: 'text' },
      { key: 'extra.服务时长', label: '服务时长', type: 'text' },
    ],
  },
]

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

/** 兼容旧数据与 AI 误判：未知分类统一归到「活动」 */
export function getCategorySpec(key: string | undefined): CategorySpec {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[3]
}

/** 从详情里取出某个字段的可展示值；没有依据就返回空串 */
export function resolveFieldValue(detail: NoticeDetail | null, key: string): string {
  if (!detail) return ''
  if (key.startsWith('extra.')) {
    const extraKey = key.slice(6)
    const value = detail.extra?.[extraKey]
    if (Array.isArray(value)) return value.filter(Boolean).join('、')
    return typeof value === 'string' ? value.trim() : ''
  }
  if (key === 'audience' || key === 'requirements') {
    const value = detail[key]
    return Array.isArray(value) ? value.filter(Boolean).join('、') : ''
  }
  const value = (detail as unknown as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** 把某一类的字段整理成卡片上可直接展示的键值对，最多 limit 条 */
export function buildCategoryFields(
  detail: NoticeDetail | null,
  category: string,
  limit = 3,
): { label: string; value: string }[] {
  return getCategorySpec(category)
    .fields.map((field) => ({ label: field.label, value: resolveFieldValue(detail, field.key) }))
    .filter((item) => !!item.value)
    .slice(0, limit)
}
