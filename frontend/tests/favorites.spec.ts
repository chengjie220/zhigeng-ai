import { beforeEach, describe, expect, it } from 'vitest'
import {
  getFavoriteIds,
  isFavorite,
  removeFavorite,
  toggleFavorite,
} from '@/utils/favorites'

const KEY = 'zhigeng_favoriteIds'

beforeEach(() => {
  localStorage.clear()
})

describe('收藏（localStorage）', () => {
  it('初始状态为空数组', () => {
    expect(getFavoriteIds()).toEqual([])
  })

  it('切换收藏：加入后再移除', () => {
    expect(toggleFavorite(3)).toBe(true)
    expect(getFavoriteIds()).toEqual([3])
    expect(isFavorite(3)).toBe(true)

    expect(toggleFavorite(3)).toBe(false)
    expect(getFavoriteIds()).toEqual([])
    expect(isFavorite(3)).toBe(false)
  })

  it('支持多条收藏并保持加入顺序', () => {
    toggleFavorite(2)
    toggleFavorite(1)
    expect(getFavoriteIds()).toEqual([2, 1])
  })

  it('removeFavorite 只移除指定 id', () => {
    toggleFavorite(1)
    toggleFavorite(2)
    removeFavorite(1)
    expect(getFavoriteIds()).toEqual([2])
  })

  it('localStorage 内容损坏时降级为空数组', () => {
    localStorage.setItem(KEY, '{not valid json')
    expect(getFavoriteIds()).toEqual([])
  })

  it('非数组或含非数字的脏数据会被过滤', () => {
    localStorage.setItem(KEY, '{"a":1}')
    expect(getFavoriteIds()).toEqual([])

    localStorage.setItem(KEY, '[1,"2",3]')
    expect(getFavoriteIds()).toEqual([1, 3])
  })
})
