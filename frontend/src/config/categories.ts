import type { NoticeDetail } from '@/types/notice'

/** 校园通知十四类，覆盖教务处与学院官网真实发布内容 */
export type CategoryKey =
  | '竞赛'
  | '创新创业'
  | '升学就业'
  | '就业指导'
  | '实践'
  | '活动'
  | '讲座'
  | '考试安排'
  | '选课成绩'
  | '学籍毕业'
  | '党团事务'
  | '公示'
  | '招投标'
  | '奖惩处分'

/** 组别：按「谁需要做什么」划分，首页只展示组别，点开再看具体类别 */
export type GroupKey = '成长机会' | '学业事务' | '公告信息'

export interface CategoryGroup {
  key: GroupKey
  description: string
  /** 组内类别，顺序即展示顺序 */
  categories: CategoryKey[]
}

export const GROUPS: CategoryGroup[] = [
  {
    key: '成长机会',
    description: '可以报名参加，抓住机会',
    categories: [
      '竞赛', '创新创业', '升学就业', '就业指导', '实践', '活动', '讲座',
    ],
  },
  {
    key: '学业事务',
    description: '必须按时办，错过有后果',
    categories: ['考试安排', '选课成绩', '学籍毕业', '党团事务'],
  },
  {
    key: '公告信息',
    description: '知晓即可，重点看异议期',
    categories: ['公示', '招投标', '奖惩处分'],
  },
]

export interface CategoryField {
  /** 字段路径：基础字段或 extra.<名称> */
  key: string
  label: string
  type: 'text' | 'date' | 'list'
}

export interface CategorySpec {
  key: CategoryKey
  group: GroupKey
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
    group: '成长机会',
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
    key: '创新创业',
    group: '成长机会',
    description: '大创计划、科创培育、项目申报与结题',
    cues: ['创新创业', '大学生创新训练', '大创', '科创', '启智计划', '萤火虫计划', '项目申报', '结题验收'],
    fields: [
      { key: 'deadline_date', label: '申报截止', type: 'date' },
      { key: 'extra.项目名称', label: '项目名称', type: 'text' },
      { key: 'extra.项目级别', label: '项目级别', type: 'text' },
      { key: 'application_method', label: '申报方式', type: 'text' },
      { key: 'requirements', label: '申报材料', type: 'list' },
    ],
  },
  {
    key: '升学就业',
    group: '成长机会',
    description: '考研、考公考编、招聘宣讲与报名确认',
    cues: [
      '考研', '研究生招生', '硕士研究生', '推免', '考公', '公务员', '国考', '省考',
      '选调生', '事业单位', '事业编', '招考', '招录', '招聘', '校招', '准考证', '报名确认',
    ],
    fields: [
      { key: 'deadline_date', label: '报名截止', type: 'date' },
      { key: 'extra.考试时间', label: '考试时间', type: 'text' },
      { key: 'extra.招录单位', label: '招录/招生单位', type: 'text' },
      { key: 'extra.准考证打印', label: '准考证打印', type: 'text' },
      { key: 'application_method', label: '报名方式', type: 'text' },
      { key: 'audience', label: '报考对象', type: 'list' },
    ],
  },
  {
    key: '就业指导',
    group: '成长机会',
    description: '公考考研咨询、留学指导、企业参访与招聘会',
    cues: ['就业指导', '公考', '留学', '简历', '访企拓岗', '企业参访', '职场', '招聘会', '梦想企航'],
    fields: [
      { key: 'deadline_date', label: '报名截止', type: 'date' },
      { key: 'extra.活动时间', label: '活动时间', type: 'text' },
      { key: 'extra.活动地点', label: '活动地点', type: 'text' },
      { key: 'application_method', label: '参与方式', type: 'text' },
      { key: 'audience', label: '面向人群', type: 'list' },
    ],
  },
  {
    key: '实践',
    group: '成长机会',
    description: '社会实践、志愿服务、实习与支教',
    cues: ['社会实践', '志愿', '三下乡', '支教', '服务队', '实习', '实践活动', '劳动教育'],
    fields: [
      { key: 'deadline_date', label: '报名截止', type: 'date' },
      { key: 'extra.实践地点', label: '实践地点', type: 'text' },
      { key: 'audience', label: '招募对象', type: 'list' },
      { key: 'application_method', label: '报名方式', type: 'text' },
      { key: 'extra.服务时长', label: '服务时长', type: 'text' },
    ],
  },
  {
    key: '活动',
    group: '成长机会',
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
    key: '讲座',
    group: '成长机会',
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
    key: '考试安排',
    group: '学业事务',
    description: '四六级、期中期末、准考证打印等考试事务',
    cues: ['考试', '四六级', '口语考试', '期中', '期末', '准考证', '考室', '候考'],
    fields: [
      { key: 'deadline_date', label: '办理截止', type: 'date' },
      { key: 'extra.考试时间', label: '考试时间', type: 'text' },
      { key: 'extra.考试地点', label: '考试地点', type: 'text' },
      { key: 'extra.准考证打印', label: '准考证打印', type: 'text' },
      { key: 'audience', label: '参考对象', type: 'list' },
    ],
  },
  {
    key: '选课成绩',
    group: '学业事务',
    description: '选课、通识选修、学习进度与成绩查询',
    cues: ['选课', '成绩', '课表', '选修课', '通识', '慕课', '智慧树', '尔雅', '重修', '学分'],
    fields: [
      { key: 'deadline_date', label: '完成截止', type: 'date' },
      { key: 'extra.办理事项', label: '办理事项', type: 'text' },
      { key: 'extra.平台入口', label: '平台入口', type: 'text' },
      { key: 'extra.考核时间', label: '考核时间', type: 'text' },
      { key: 'audience', label: '适用对象', type: 'list' },
    ],
  },
  {
    key: '学籍毕业',
    group: '学业事务',
    description: '转专业、休复学、毕业设计与证明办理',
    cues: ['学籍', '转专业', '休学', '复学', '毕业设计', '毕业论文', '在读证明', '学历', '学位', '保留入学资格'],
    fields: [
      { key: 'deadline_date', label: '办理截止', type: 'date' },
      { key: 'extra.办理事项', label: '办理事项', type: 'text' },
      { key: 'extra.所需材料', label: '所需材料', type: 'text' },
      { key: 'audience', label: '适用对象', type: 'list' },
    ],
  },
  {
    key: '党团事务',
    group: '学业事务',
    description: '党校培训、入党积极分子、发展对象与主题团日',
    cues: ['党校', '党课', '入党积极分子', '发展对象', '党支部', '团委', '团员', '主题团日'],
    fields: [
      { key: 'deadline_date', label: '办理截止', type: 'date' },
      { key: 'extra.办理事项', label: '办理事项', type: 'text' },
      { key: 'extra.参与对象', label: '参与对象', type: 'text' },
      { key: 'extra.时间地点', label: '时间地点', type: 'text' },
    ],
  },
  {
    key: '公示',
    group: '公告信息',
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
    key: '招投标',
    group: '公告信息',
    description: '采购比选、招标中标与结果公示',
    cues: ['比选', '招标', '采购', '中标', '磋商', '询价', '中选候选人'],
    fields: [
      { key: 'deadline_date', label: '异议截止', type: 'date' },
      { key: 'extra.采购标的', label: '采购标的', type: 'text' },
      { key: 'extra.中选候选人', label: '中选候选人', type: 'text' },
      { key: 'extra.异议反馈', label: '异议反馈', type: 'text' },
    ],
  },
  {
    key: '奖惩处分',
    group: '公告信息',
    description: '违纪处分、表彰奖励与评优结果',
    cues: ['处分', '违纪', '警告', '表彰', '奖励', '评优', '荣誉称号'],
    fields: [
      { key: 'deadline_date', label: '异议截止', type: 'date' },
      { key: 'extra.处理对象', label: '涉及对象', type: 'text' },
      { key: 'extra.处理决定', label: '处理决定', type: 'text' },
      { key: 'extra.发布单位', label: '发布单位', type: 'text' },
    ],
  },
]

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

/** 兼容旧数据与 AI 误判：未知分类统一归到「活动」 */
export function getCategorySpec(key: string | undefined): CategorySpec {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES.find((c) => c.key === '活动')!
}

/** 取某个组别下的类别配置 */
export function getGroupCategories(group: GroupKey): CategorySpec[] {
  return CATEGORIES.filter((c) => c.group === group)
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
