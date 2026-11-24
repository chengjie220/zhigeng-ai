import { getNotices, getNoticeDetail, getStats } from './notices'
import { getSources } from './sources'
import type { NoticeDetail, NoticeItem, SourceItem } from '@/types/notice'
import { buildBriefActions, countRecentNotices, type BriefAction } from '@/utils/brief'

/** 首页简报所需的全部数据，由现有接口组合而成，无需后端新增接口 */
export interface BriefData {
  total: number
  urgentTotal: number
  recentTotal: number
  unknownTotal: number
  sourceCount: number
  actions: BriefAction[]
  latest: NoticeItem[]
  sources: SourceItem[]
}

/**
 * 拉取简报数据。
 * 详情接口逐条请求，单条失败不影响整份简报（降级为「待核实」）。
 */
export async function getBriefData(): Promise<BriefData> {
  const [urgentResp, unknownResp, publishedResp, statsResp, sources] = await Promise.all([
    getNotices({ deadline_status: 'urgent', sort: 'deadline', page_size: 6 }),
    getNotices({ deadline_status: 'unknown', page_size: 1 }),
    getNotices({ sort: 'published', page_size: 50 }),
    getStats(),
    getSources().catch(() => [] as SourceItem[]),
  ])

  const actionItems = urgentResp.items.slice(0, 3)
  const settled = await Promise.allSettled(actionItems.map((n) => getNoticeDetail(n.id)))
  const detailsById = new Map<number, NoticeDetail>()
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') detailsById.set(actionItems[i].id, result.value)
  })

  return {
    total: statsResp.total,
    urgentTotal: urgentResp.total,
    recentTotal: countRecentNotices(publishedResp.items),
    unknownTotal: unknownResp.total,
    sourceCount: sources.length,
    actions: buildBriefActions(urgentResp.items, detailsById, 3),
    latest: publishedResp.items.slice(0, 5),
    sources,
  }
}
