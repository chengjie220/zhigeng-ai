import { beforeEach, describe, expect, it } from 'vitest'
import { CATEGORY_KEYS } from '@/config/categories'
import {
  getFocusedCategories,
  isCategoryFocused,
  setFocusedCategories,
  toggleFocusedCategory,
} from '@/utils/categoryPrefs'

beforeEach(() => {
  localStorage.clear()
})

describe('用户重点关注类别', () => {
  it('未设置时默认全部关注', () => {
    expect(getFocusedCategories()).toEqual(CATEGORY_KEYS)
  })

  it('保存后只返回用户选择的类别', () => {
    setFocusedCategories(['考研' as never, '考试安排', '公示'])
    expect(getFocusedCategories()).toEqual(['考试安排', '公示'])
  })

  it('允许一个类别都不关注', () => {
    setFocusedCategories([])
    expect(getFocusedCategories()).toEqual([])
  })

  it('切换单个类别不影响其他类别', () => {
    setFocusedCategories(['竞赛', '公示'])
    expect(toggleFocusedCategory('考试安排')).toBe(true)
    expect(getFocusedCategories()).toEqual(['竞赛', '公示', '考试安排'])
    expect(toggleFocusedCategory('公示')).toBe(false)
    expect(getFocusedCategories()).toEqual(['竞赛', '考试安排'])
    expect(isCategoryFocused('竞赛')).toBe(true)
  })

  it('本地存储损坏时安全回退到全部关注', () => {
    localStorage.setItem('zg_focused_categories', '{ not json')
    expect(getFocusedCategories()).toEqual(CATEGORY_KEYS)
  })
})
