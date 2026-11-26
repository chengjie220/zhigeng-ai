import { CATEGORY_KEYS, type CategoryKey } from '@/config/categories'

const STORAGE_KEY = 'zg_focused_categories'

/**
 * 用户重点关注的类别。
 * 未设置过时默认全部关注；一旦保存过，就严格按用户选择（允许一个都不选）。
 * 类别体系会随信息源增加而扩充，这里只认当前合法的类别，避免旧数据污染。
 */
export function getFocusedCategories(): CategoryKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return [...CATEGORY_KEYS]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...CATEGORY_KEYS]
    return parsed.filter((key): key is CategoryKey => CATEGORY_KEYS.includes(key as CategoryKey))
  } catch {
    return [...CATEGORY_KEYS]
  }
}

/** 保存关注类别（自动剔除已下线的类别） */
export function setFocusedCategories(keys: CategoryKey[]): void {
  const valid = keys.filter((key) => CATEGORY_KEYS.includes(key))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
}

/** 切换单个类别，返回切换后是否关注 */
export function toggleFocusedCategory(key: CategoryKey): boolean {
  const next = new Set(getFocusedCategories())
  if (next.has(key)) next.delete(key)
  else next.add(key)
  setFocusedCategories([...next])
  return next.has(key)
}

/** 某个类别是否在用户的关注范围内 */
export function isCategoryFocused(key: CategoryKey): boolean {
  return getFocusedCategories().includes(key)
}
