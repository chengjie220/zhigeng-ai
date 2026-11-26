import { describe, expect, it } from 'vitest'
import { CATEGORY_KEYS } from '@/config/categories'
import { mockNotices, mockSources } from '@/api/mock/data'
import { containsText } from '@/utils/highlight'

/**
 * 示例数据自检：保证演示时「原文依据 → 正文高亮」这条链路真的走得通。
 * 之前 mock 的正文是截断占位符，证据在正文里根本找不到，功能等于演示不出来。
 */
describe('示例数据完整性', () => {
  it('通知 id 唯一且唯一键为数字', () => {
    const ids = mockNotices.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true)
  })

  it('每条通知都有正文，且来源存在', () => {
    const sourceIds = new Set(mockSources.map((s) => s.id))
    for (const n of mockNotices) {
      expect(n.body_text.trim().length, `通知 ${n.id} 缺少正文`).toBeGreaterThan(0)
      expect(sourceIds.has(n.source_id), `通知 ${n.id} 的来源不存在`).toBe(true)
      expect(n.title.length).toBeGreaterThan(0)
    }
  })

  it('每条证据原文都能在正文中找到（保证高亮可定位）', () => {
    for (const n of mockNotices) {
      for (const [field, quote] of Object.entries(n.evidence)) {
        expect(
          containsText(n.body_text, quote),
          `通知 ${n.id} 的 ${field} 证据在正文中找不到：「${quote}」`,
        ).toBe(true)
      }
    }
  })

  it('示例附件都能就地读取，不需要真的访问外部链接', () => {
    const withAttachments = mockNotices.filter((n) => n.attachments.length > 0)
    expect(withAttachments.length).toBeGreaterThan(0)
    for (const notice of withAttachments) {
      for (const attachment of notice.attachments) {
        expect(attachment.content, `通知 ${notice.id} 的附件「${attachment.name}」没有示例内容`).toBeTruthy()
      }
    }
  })

  it('分类取值非空，预置类别与动态类别各有来源', () => {
    const discovered = ['读者服务', '馆务公告']
    for (const n of mockNotices) {
      expect(n.category, `通知 ${n.id} 缺少分类`).toBeTruthy()
      expect(
        CATEGORY_KEYS.includes(n.category as (typeof CATEGORY_KEYS)[number]) ||
          discovered.includes(n.category),
        `通知 ${n.id} 的分类「${n.category}」既不是预置类别也不是示例动态类别`,
      ).toBe(true)
    }
    expect(mockNotices.some((n) => discovered.includes(n.category))).toBe(true)
  })
})
