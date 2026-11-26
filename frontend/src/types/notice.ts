/** AI 解析状态：已解析 / 处理中 / 解析失败 */
export type AiStatus = 'done' | 'pending' | 'failed'

/** 列表页通知条目（对应 GET /api/v1/notices 返回的 items 字段） */
export interface NoticeItem {
  id: number
  title: string
  source_id: number
  source_name: string
  category: string
  published_at: string
  deadline_date: string | null
  deadline_time: string | null
  summary: string
  ai_status: AiStatus
  original_url: string
}

/** 原文证据：字段名 -> 原文片段 */
export interface NoticeEvidence {
  [field: string]: string
}

export interface NoticeAttachment {
  name: string
  url: string
  /** 可直接展示的附件正文；后端解析成功或 Mock 数据时提供 */
  content?: string
  /** 无法直接解析时说明原因 */
  unsupported?: string
}

/** 通知详情（对应 GET /api/v1/notices/{id}） */
export interface NoticeDetail extends NoticeItem {
  audience: string[]
  requirements: string[]
  application_method: string | null
  evidence: NoticeEvidence
  attachments: NoticeAttachment[]
  body_text: string
  /** 分类专属字段：如公示期、主讲人、赛事级别；无依据时不会出现 */
  extra?: Record<string, string | string[]>
}

/** 预置信息源（对应 GET /api/v1/sources） */
export interface SourceItem {
  id: number
  name: string
  url: string
  content_types: string
  last_synced_at: string | null
  enabled: boolean
  /** 用户自行添加的来源 */
  is_custom?: boolean
}

/** 联网搜索到的候选网站 */
export interface SourceSearchResult {
  title: string
  url: string
  snippet: string
  domain: string
}

/** 网址探测结果：能不能作为一个通知列表页来采集 */
export interface SourceProbeResult {
  ok: boolean
  name: string
  reason: string
  sample_count: number
  samples: string[]
}

export interface SourceCreatePayload {
  name: string
  url: string
  content_types?: string
}

/** 通知列表响应结构 */
export interface NoticeListResp {
  items: NoticeItem[]
  total: number
  page: number
  page_size: number
}

/** 列表查询参数 */
export type DeadlineFilter = 'all' | 'urgent' | 'upcoming' | 'expired' | 'unknown'

/**
 * 排序方式：
 * - deadline：最近截止优先（已截止沉底，截止日期未知的最后）
 * - published：最新发布优先
 */
export type NoticeSort = 'deadline' | 'published'

export interface NoticeQuery {
  q?: string
  category?: string
  source_id?: number
  /** 订阅过滤（扩展参数，逗号分隔多个来源 ID） */
  source_ids?: number[]
  deadline_status?: DeadlineFilter
  sort?: NoticeSort
  page?: number
  page_size?: number
}

/** 截止状态计算结果 */
export type DeadlineStatus = 'expired' | 'urgent' | 'upcoming' | 'unknown'
