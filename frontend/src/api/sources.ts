import request from './request'
import { mockProbeSource, mockSources, mockSourceSearchResults } from './mock/data'
import { USE_MOCK } from './notices'
import type {
  SourceCreatePayload,
  SourceItem,
  SourceProbeResult,
  SourceSearchResult,
} from '@/types/notice'

function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/** 获取预置信息源列表 */
export async function getSources(): Promise<SourceItem[]> {
  if (USE_MOCK) return delay([...mockSources])
  return (await request.get('/sources')) as SourceItem[]
}

/** 联网按关键词搜索校园网站候选 */
export async function searchSourceSites(keyword: string): Promise<SourceSearchResult[]> {
  if (!keyword.trim()) return []
  if (USE_MOCK) {
    const kw = keyword.trim().toLowerCase()
    const matched = mockSourceSearchResults.filter((s) =>
      `${s.title}${s.snippet}${s.domain}`.toLowerCase().includes(kw),
    )
    return delay(matched.length ? matched : mockSourceSearchResults)
  }
  return (await request.get('/sources/search', { params: { q: keyword.trim() } })) as SourceSearchResult[]
}

/** 探测网址是否像通知列表页 */
export async function probeSourceUrl(url: string): Promise<SourceProbeResult> {
  if (USE_MOCK) return delay(mockProbeSource(url))
  return (await request.get('/sources/probe', { params: { url } })) as SourceProbeResult
}

/** 添加自定义信息源 */
export async function createSource(payload: SourceCreatePayload): Promise<SourceItem> {
  if (USE_MOCK) {
    return delay({
      id: Date.now(),
      name: payload.name,
      url: payload.url,
      content_types: payload.content_types || '自定义来源',
      last_synced_at: null,
      enabled: true,
      is_custom: true,
    })
  }
  return (await request.post('/sources', payload)) as SourceItem
}
