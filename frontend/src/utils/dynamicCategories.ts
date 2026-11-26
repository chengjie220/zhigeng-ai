import {
  CATEGORIES,
  DISCOVERY_GROUP,
  GROUPS,
  getCategorySpec,
  isKnownCategory,
  type CategorySpec,
  type GroupKey,
} from '@/config/categories'
import type { NoticeItem } from '@/types/notice'

/** 数据里真实存在的类别：数量、临期数、来自哪些网站都从通知实时算出来 */
export interface DynamicCategory extends CategorySpec {
  total: number
  urgent: number
  sources: string[]
  /** 不是预置的 14 类，而是新网站带来的类别 */
  discovered: boolean
}

export interface DynamicGroup {
  key: GroupKey
  description: string
  categories: DynamicCategory[]
}

export interface DynamicCatalog {
  categories: DynamicCategory[]
  groups: DynamicGroup[]
  /** 通知 id → 最终归属类别；关键词重分类后的结果也在这里 */
  categoryOf: Map<number, string>
  /** 有多少条通知是因为关键词匹配被重新归类的 */
  reclassified: number
}

const KNOWN_ORDER = new Map(CATEGORIES.map((spec, index) => [spec.key, index]))

/**
 * 未知类别按内容找归属：标题里的关键词权重更高。
 * 「活动」「名单」这类过于宽泛的词单独出现不足以改判，避免把所有通知都吞进去。
 */
export function inferCategoryKey(notice: {
  title: string
  summary?: string
}): string | null {
  const title = notice.title ?? ''
  const summary = notice.summary ?? ''
  let best: string | null = null
  let bestScore = 0
  for (const spec of CATEGORIES) {
    let score = 0
    for (const cue of spec.cues) {
      if (title.includes(cue)) score += 2
      if (summary.includes(cue)) score += 1
    }
    if ((spec.key === '活动' || spec.key === '公示') && score < 2) continue
    if (score > bestScore) {
      best = spec.key
      bestScore = score
    }
  }
  return best
}

/**
 * 从当前通知集合生成类别目录。
 * - 已知类别沿用专属配置，没有通知的类别直接不出现；
 * - 未知类别先用内容关键词尝试归入已知类别，匹配不到就保留原名进入「新发现」组；
 * - 新增网站同步后再次调用即可，首页不需要改代码。
 */
export function buildDynamicCatalog(
  notices: NoticeItem[],
  urgentIds: Set<number> = new Set(),
): DynamicCatalog {
  const totals = new Map<string, number>()
  const urgents = new Map<string, number>()
  const sourceSets = new Map<string, Set<string>>()
  const categoryOf = new Map<number, string>()
  let reclassified = 0

  for (const notice of notices) {
    const raw = (notice.category ?? '').trim()
    let key: string
    if (isKnownCategory(raw)) {
      key = raw
    } else {
      const inferred = inferCategoryKey(notice)
      key = inferred ?? raw ?? ''
      if (!key) key = '其他通知'
      if (inferred && inferred !== raw) reclassified += 1
    }
    categoryOf.set(notice.id, key)
    totals.set(key, (totals.get(key) ?? 0) + 1)
    if (urgentIds.has(notice.id)) urgents.set(key, (urgents.get(key) ?? 0) + 1)
    if (!sourceSets.has(key)) sourceSets.set(key, new Set())
    if (notice.source_name) sourceSets.get(key)!.add(notice.source_name)
  }

  const categories: DynamicCategory[] = [...totals.entries()].map(([key, total]) => {
    const spec: CategorySpec = getCategorySpec(key)
    return {
      ...spec,
      group: isKnownCategory(key) ? spec.group : DISCOVERY_GROUP.key,
      total,
      urgent: urgents.get(key) ?? 0,
      sources: [...(sourceSets.get(key) ?? [])],
      discovered: !isKnownCategory(key),
    }
  })

  // 预置类别按原有顺序，新类别按数量降序，保证首页稳定又可发现新增内容
  categories.sort((a, b) => {
    const ai = KNOWN_ORDER.get(a.key)
    const bi = KNOWN_ORDER.get(b.key)
    if (ai !== undefined && bi !== undefined) return ai - bi
    if (ai !== undefined) return -1
    if (bi !== undefined) return 1
    return b.total - a.total || a.key.localeCompare(b.key, 'zh-Hans-CN')
  })

  const groups: DynamicGroup[] = [...GROUPS, DISCOVERY_GROUP]
    .map((group) => ({
      key: group.key,
      description: group.description,
      categories: categories
        .filter((c) => c.group === group.key)
        .sort((a, b) => b.urgent - a.urgent || b.total - a.total || a.key.localeCompare(b.key, 'zh-Hans-CN')),
    }))
    .filter((group) => group.categories.length > 0)

  return { categories, groups, categoryOf, reclassified }
}

/**
 * 首次使用时的默认订阅：优先选当前最需要处理的三类。
 * 之后完全按用户选择，新出现的类别不会再自动进入首页。
 */
export function defaultFocusKeys(categories: DynamicCategory[], limit = 3): string[] {
  return [...categories]
    .sort((a, b) => b.urgent - a.urgent || b.total - a.total)
    .slice(0, limit)
    .map((c) => c.key)
}
