import type { DeadlineStatus } from '@/types/notice'

/** 解析 YYYY-MM-DD 为本地零点时间 */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 距离截止日期的天数（负数=已过期，0=今天）；无日期返回 null */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = parseDate(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/** 计算截止状态：已截止 / 7天内截止 / 未截止 / 待核实 */
export function getDeadlineStatus(dateStr: string | null): DeadlineStatus {
  const days = daysUntil(dateStr)
  if (days === null) return 'unknown'
  if (days < 0) return 'expired'
  if (days <= 7) return 'urgent'
  return 'upcoming'
}

/** 格式化日期为「M月D日」 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '待核实'
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}

/** 格式化日期为完整年月日 */
export function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '待核实'
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

/** 徽标文案 */
export function deadlineLabel(dateStr: string | null, dateOnly = false): string {
  const status = getDeadlineStatus(dateStr)
  switch (status) {
    case 'expired':
      return '已截止'
    case 'urgent': {
      const days = daysUntil(dateStr)
      if (days === 0) return '今天截止'
      return `${days}天后截止`
    }
    case 'upcoming':
      return dateOnly ? `截止 ${formatDate(dateStr)}` : `截止 ${formatDate(dateStr)}`
    default:
      return '截止待核实'
  }
}
