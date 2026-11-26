import { beforeEach, describe, expect, it } from 'vitest'
import { CATEGORY_KEYS } from '@/config/categories'
import {
  getFocusedCategories,
  hasFocusPreferences,
  isCategoryFocused,
  setFocusedCategories,
  toggleFocusedCategory,
} from '@/utils/categoryPrefs'

beforeEach(() => {
  localStorage.clear()
})

describe('用户订阅类别', () => {
  it('未设置时默认全部关注', () => {
    expect(hasFocusPreferences()).toBe(false)
    expect(getFocusedCategories()).toEqual(CATEGORY_KEYS)
  })

  it('保存后支持任意类别，包括新网站带来的类别', () => {
    setFocusedCategories(['考研', '考试安排', '馆务公告'])
    expect(hasFocusPreferences()).toBe(true)
    expect(getFocusedCategories()).toEqual(['考研', '考试安排', '馆务公告'])
  })

  it('传入当前可用类别时，只返回真实存在的订阅', () => {
    setFocusedCategories(['考试安排', '馆务公告', '已下线类别'])
    expect(getFocusedCategories(['考试安排', '公示', '馆务公告'])).toEqual(['考试安排', '馆务公告'])
  })

  it('允许一个类别都不订阅', () => {
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

  it('重复保存会去重，空字符串不会写入', () => {
    setFocusedCategories(['竞赛', '竞赛', ' ', '馆务公告'])
    expect(getFocusedCategories()).toEqual(['竞赛', '馆务公告'])
  })

  it('本地存储损坏时安全回退到全部关注', () => {
    localStorage.setItem('zg_focused_categories', '{ not json')
    expect(getFocusedCategories()).toEqual(CATEGORY_KEYS)
  })
})
