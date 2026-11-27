import { describe, expect, it } from 'vitest'
import { askQuestion, ASK_SUGGESTIONS } from '@/api/ai'
import { mockNotices } from '@/api/mock/data'

describe('问知更 AI 问答', () => {
  it('mock 模式下能返回答案与原文引用', async () => {
    const res = await askQuestion('这周有什么比赛能报名？')
    expect(res.answer.length).toBeGreaterThan(0)
    expect(res.citations.length).toBeGreaterThan(0)
    expect(res.citations.length).toBeLessThanOrEqual(5)
    expect(res.mode).toBe('rule')
  })

  it('引用片段必须逐字来自对应通知正文', async () => {
    const res = await askQuestion('这周有什么比赛能报名？')
    for (const c of res.citations) {
      const detail = mockNotices.find((n) => n.id === c.notice_id)
      expect(detail).toBeTruthy()
      const body = (detail!.body_text || '').replace(/\s+/g, '')
      expect(body.includes(c.snippet.replace(/\s+/g, ''))).toBe(true)
    }
  })

  it('空问题直接抛错，不发起无意义请求', async () => {
    await expect(askQuestion('   ')).rejects.toThrow()
  })

  it('推荐问题都是非空短句', () => {
    expect(ASK_SUGGESTIONS.length).toBeGreaterThanOrEqual(3)
    for (const s of ASK_SUGGESTIONS) {
      expect(s.trim().length).toBeGreaterThan(2)
      expect(s.length).toBeLessThanOrEqual(200)
    }
  })
})
