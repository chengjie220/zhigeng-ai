import { beforeEach, describe, expect, it } from 'vitest'
import {
  getSelectedSourceIds,
  isSourceSubscribed,
  setSelectedSourceIds,
  toggleSourceId,
} from '@/utils/sourcePrefs'

const ALL_IDS = [1, 2, 3]

beforeEach(() => {
  localStorage.clear()
})

describe('信息源订阅（localStorage）', () => {
  it('从未设置过时返回 null，且默认所有来源都已订阅', () => {
    expect(getSelectedSourceIds()).toBeNull()
    expect(isSourceSubscribed(1)).toBe(true)
    expect(isSourceSubscribed(99)).toBe(true)
  })

  it('首次取消订阅时，只有被点击的来源被移除，其余保持订阅', () => {
    const nowOn = toggleSourceId(2, ALL_IDS)
    expect(nowOn).toBe(false)
    expect(getSelectedSourceIds()).toEqual([1, 3])
    expect(isSourceSubscribed(2)).toBe(false)
    expect(isSourceSubscribed(1)).toBe(true)
  })

  it('再次切换可以恢复订阅', () => {
    toggleSourceId(2, ALL_IDS)
    expect(toggleSourceId(2)).toBe(true)
    expect(getSelectedSourceIds()).toEqual([1, 2, 3])
  })

  it('全部取消后返回空数组，且与「未设置」区分开', () => {
    setSelectedSourceIds([])
    expect(getSelectedSourceIds()).toEqual([])
    expect(isSourceSubscribed(1)).toBe(false)
  })

  it('脏数据降级为 null（视为全部订阅）', () => {
    localStorage.setItem('zhigeng_selectedSourceIds', '"oops"')
    expect(getSelectedSourceIds()).toBeNull()
  })
})
