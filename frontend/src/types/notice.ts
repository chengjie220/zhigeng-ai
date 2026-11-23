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
}

/** 通知详情（对应 GET /api/v1/notices/{id}） */
export interface NoticeDetail extends NoticeItem {
  audience: string[]
  requirements: string[]
  application_method: string | null
  evidence: NoticeEvidence
  attachments: NoticeAttachment[]
  body_text: string
}

/** 预置信息源（对应 GET /api/v1/sources） */
export interface SourceItem {
  id: number
  name: string
  url: string
  content_types: string
  last_synced_at: string | null
  enabled: boolean
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

export interface NoticeQuery {
  q?: string
  category?: string
  source_id?: number
  /** 订阅过滤（扩展参数，逗号分隔多个来源 ID） */
  source_ids?: number[]
  deadline_status?: DeadlineFilter
  page?: number
  page_size?: number
}

/** 截止状态计算结果 */
export type DeadlineStatus = 'expired' | 'urgent' | 'upcoming' | 'unknown'
