import request from './request'
import { mockSources } from './mock/data'
import { USE_MOCK } from './notices'
import type { SourceItem } from '@/types/notice'

function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/** 获取预置信息源列表 */
export async function getSources(): Promise<SourceItem[]> {
  if (USE_MOCK) return delay([...mockSources])
  return (await request.get('/sources')) as SourceItem[]
}
