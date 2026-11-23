/**
 * 本地收藏（localStorage 持久化）。
 * 第一版无账户系统，收藏仅保存在当前浏览器。
 */
const KEY = 'zhigeng_favoriteIds'

export function getFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n): n is number => typeof n === 'number')
  } catch {
    return []
  }
}

export function isFavorite(id: number): boolean {
  return getFavoriteIds().includes(id)
}

/** 切换收藏，返回切换后的状态 */
export function toggleFavorite(id: number): boolean {
  const ids = getFavoriteIds()
  const idx = ids.indexOf(id)
  if (idx >= 0) {
    ids.splice(idx, 1)
  } else {
    ids.push(id)
  }
  localStorage.setItem(KEY, JSON.stringify(ids))
  return idx < 0
}

export function removeFavorite(id: number): void {
  const ids = getFavoriteIds().filter((n) => n !== id)
  localStorage.setItem(KEY, JSON.stringify(ids))
}
