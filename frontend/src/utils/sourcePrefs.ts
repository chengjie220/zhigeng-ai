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

/**
 * 切换单个来源的订阅状态，返回切换后的状态。
 * allSourceIds：当前全部来源 ID。首次操作（尚未写过 localStorage）时会用它
 * 把「全部订阅」展开成显式列表，否则取消一个来源会误伤其他所有来源。
 */
export function toggleSourceId(id: number, allSourceIds: number[] = []): boolean {
  const current = getSelectedSourceIds()
  const set = new Set(current ?? allSourceIds)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  // 排序后写入，保证同一订阅组合的存储结果稳定
  const next = [...set].sort((a, b) => a - b)
  setSelectedSourceIds(next)
  return set.has(id)
}

export function isSourceSubscribed(id: number): boolean {
  const current = getSelectedSourceIds()
  if (current === null) return true
  return current.includes(id)
}
