import type { NoticeDetail, NoticeItem } from '@/types/notice'
import { daysUntil, getDeadlineStatus } from './date'

/** 简报里的一条「待办式」机会 */
export interface BriefAction {
  notice: NoticeItem
  detail: NoticeDetail | null
  daysLeft: number | null
  /** 一句话说明下一步该做什么 */
  actionText: string
  /** 谁可以参加 */
  audienceText: string
}

/** 没有可用 AI 字段时的统一占位 */
export const ACTION_PLACEHOLDER = '报名方式待核实，请查看原文'

/**
 * 从 AI 提取结果里挑一句最能指导行动的文案。
 * 优先级：报名方式 > 所需材料 > 占位文案。不做任何编造。
 */
export function pickActionText(detail: NoticeDetail | null, category?: string): string {
  if (!detail) return ACTION_PLACEHOLDER
  if (category === '公示') {
    const feedback = detail.extra?.['异议反馈']
    if (typeof feedback === 'string' && feedback.trim()) return feedback
    if (Array.isArray(feedback) && feedback.length) return feedback.join('；')
    return '异议反馈方式待核实，请查看原文'
  }
  if (category === '升学就业') {
    const method = detail.application_method?.trim()
    if (method) return method
    const admission = detail.extra?.['准考证打印']
    if (typeof admission === 'string' && admission.trim()) return `准考证：${admission}`
    return '报名安排待核实，请查看原文'
  }
  if (category === '选课成绩' || category === '学籍毕业') {
    const task = detail.extra?.['办理事项']
    if (typeof task === 'string' && task.trim()) return task
  }
  if (category === '招投标') {
    const feedback = detail.extra?.['异议反馈']
    if (typeof feedback === 'string' && feedback.trim()) return feedback
    return '异议方式待核实，请查看原文'
  }
  const method = detail.application_method?.trim()
  if (method) return method
  const requirements = (detail.requirements ?? []).filter((r) => r?.trim())
  if (requirements.length) return `材料要求：${requirements.slice(0, 2).join('；')}`
  return ACTION_PLACEHOLDER
}

/** 参与对象最多展示前三项，避免卡片被标签淹没 */
export function pickAudienceText(detail: NoticeDetail | null): string {
  const audience = (detail?.audience ?? []).filter((a) => a?.trim())
  if (!audience.length) return '参与对象待核实'
  return audience.slice(0, 3).join('、')
}

/** 统计最近 N 天发布的通知数量（按 published_at 前 10 位日期比较） */
export function countRecentNotices(items: NoticeItem[], days = 7, today = new Date()): number {
  const threshold = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  threshold.setDate(threshold.getDate() - days + 1)
  const limit = `${threshold.getFullYear()}-${String(threshold.getMonth() + 1).padStart(2, '0')}-${String(threshold.getDate()).padStart(2, '0')}`
  return items.filter((n) => {
    const day = n.published_at?.slice(0, 10)
    return !!day && day >= limit
  }).length
}

/**
 * 把「7 天内截止」的列表整理成行动卡片。
 * 已截止的条目即使被接口返回也会被剔除——简报只展示还能行动的机会。
 */
export function buildBriefActions(
  items: NoticeItem[],
  detailsById: Map<number, NoticeDetail>,
  limit = 3,
): BriefAction[] {
  return items
    .filter((n) => getDeadlineStatus(n.deadline_date) === 'urgent')
    .slice(0, limit)
    .map((notice) => {
      const detail = detailsById.get(notice.id) ?? null
      return {
        notice,
        detail,
        daysLeft: daysUntil(notice.deadline_date),
        actionText: pickActionText(detail, notice.category),
        audienceText: pickAudienceText(detail),
      }
    })
}

/** 简报标题：有临近截止就说清数量，没有则如实说明；分类模式下点明类别 */
export function briefHeadline(urgentTotal: number, category?: string): string {
  const scope = category ? `${category}类` : ''
  if (urgentTotal <= 0) return `这周没有临近截止的${scope || '校园'}机会`
  return `${scope}有 ${urgentTotal} 件事快截止了`
}
