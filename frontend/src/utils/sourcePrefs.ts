/**
 * 信息源订阅偏好（localStorage 持久化）。
 * null 表示用户从未设置过（首页默认显示全部来源）；
 * 空数组表示用户取消了全部订阅。
 */
const KEY = 'zhigeng_selectedSourceIds'

export function getSelectedSourceIds(): number[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((n): n is number => typeof n === 'number')
  } catch {
    return null
  }
}

export function setSelectedSourceIds(ids: number[]): void {
  localStorage.setItem(KEY, JSON.stringify(ids))
}

/** 切换单个来源的订阅状态 */
export function toggleSourceId(id: number): boolean {
  const current = getSelectedSourceIds()
  // 从未设置过时，视为全部已订阅
  const set = new Set(current ?? undefined)
  if (current === null) {
    // 首次操作：从「全部」转为显式列表，先移除被点的这一个
    set.delete(id)
  } else if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  const next = [...set]
  setSelectedSourceIds(next)
  return set.has(id)
}

export function isSourceSubscribed(id: number): boolean {
  const current = getSelectedSourceIds()
  if (current === null) return true
  return current.includes(id)
}
