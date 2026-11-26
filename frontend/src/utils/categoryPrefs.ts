import { CATEGORY_KEYS } from '@/config/categories'

const STORAGE_KEY = 'zg_focused_categories'

/** 用户是否保存过订阅设置；没有保存过时首页会给出一份精简的默认订阅 */
export function hasFocusPreferences(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

/**
 * 用户订阅的类别。
 * 类别会随新网站接入而扩充，因此这里接受任意字符串键；传入 availableKeys 时只返回当前真实存在的类别。
 * 未设置过时默认全部关注（兼容旧行为，首页会另行给出精简默认值）。
 */
export function getFocusedCategories(availableKeys?: string[]): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return availableKeys ? [...new Set(availableKeys)] : [...CATEGORY_KEYS]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return availableKeys ? [...new Set(availableKeys)] : [...CATEGORY_KEYS]
    const available = availableKeys ? new Set(availableKeys) : null
    const result: string[] = []
    for (const key of parsed) {
      if (typeof key !== 'string' || !key.trim()) continue
      if (available && !available.has(key)) continue
      if (!result.includes(key)) result.push(key)
    }
    return result
  } catch {
    return availableKeys ? [...new Set(availableKeys)] : [...CATEGORY_KEYS]
  }
}

/** 保存订阅类别（保留新网站带来的任意类别，自动去重） */
export function setFocusedCategories(keys: string[]): void {
  const valid: string[] = []
  for (const key of keys) {
    if (typeof key !== 'string' || !key.trim()) continue
    if (!valid.includes(key)) valid.push(key)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
}

/** 切换单个类别，返回切换后是否订阅 */
export function toggleFocusedCategory(key: string): boolean {
  const next = new Set(getFocusedCategories())
  if (next.has(key)) next.delete(key)
  else next.add(key)
  setFocusedCategories([...next])
  return next.has(key)
}

/** 某个类别是否在用户的订阅范围内 */
export function isCategoryFocused(key: string): boolean {
  return getFocusedCategories().includes(key)
}
