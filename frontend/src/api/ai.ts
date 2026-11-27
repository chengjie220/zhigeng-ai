import request from './request'
import { USE_MOCK } from './notices'
import { mockNotices } from './mock/data'
import type { QAAnswer, QACitation } from '@/types/ai'

/** 示例问题：演示时点一下就有答案，不用现想 */
export const ASK_SUGGESTIONS = [
  '这周有什么比赛能报名？',
  '最近有哪些讲座？',
  '四级什么时候报名？',
  '有什么可以加分的创新创业活动？',
  '有哪些公示还在异议期内？',
]

/** Mock 模式：用本地示例数据拼一个「检索 + 引用」的回答，保证无后端也能演示 */
function askMock(question: string): QAAnswer {
  const kw = question.replace(/[？?。，,！!的有吗呢什么哪些怎么]/g, ' ').trim()
  const words = kw.split(/\s+/).filter((w) => w.length >= 2)
  const matched = mockNotices.filter((n) => {
    const text = `${n.title}${n.summary}${n.category}${n.body_text}`
    return words.some((w) => text.includes(w))
  })
  const pool = (matched.length > 0 ? matched : mockNotices).slice(0, 5)

  const citations: QACitation[] = pool.map((n) => {
    const firstSentence = (n.body_text || n.summary || '').split(/[。！？；\n]/).find((s) => s.trim().length >= 6)
    return {
      notice_id: n.id,
      title: n.title,
      category: n.category,
      deadline_date: n.deadline_date,
      deadline_time: n.deadline_time,
      snippet: (firstSentence || n.summary).trim().slice(0, 120),
      original_url: n.original_url,
    }
  })

  const lines = pool.map((n, i) => {
    const dl = n.deadline_date ? `截止 ${n.deadline_date}${n.deadline_time ? ` ${n.deadline_time}` : ''}` : '截止待核实'
    return `${i + 1}. ${n.title}（${n.category}，${dl}）`
  })

  return {
    question,
    answer: pool.length
      ? `共找到 ${pool.length} 条相关通知，按截止时间排序如下：\n${lines.join('\n')}\n每条均有原文依据，见下方引用卡片。`
      : '暂时没有找到符合条件的通知。可以换个说法，或到「全部通知」里手动检索。',
    mode: 'rule',
    citations,
    candidate_ids: pool.map((n) => n.id),
    disclaimer: '示例数据模式下的回答，仅供界面预览。',
  }
}

/** 提问：返回答案 + 原文引用 */
export async function askQuestion(question: string): Promise<QAAnswer> {
  const q = question.trim()
  if (!q) throw new Error('请输入问题')
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 350))
    return askMock(q)
  }
  return request.get<unknown, QAAnswer>('/qa', { params: { q } })
}
