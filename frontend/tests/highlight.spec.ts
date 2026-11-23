import { describe, expect, it } from 'vitest'
import { containsText, splitByKeyword } from '@/utils/highlight'

describe('splitByKeyword', () => {
  it('空关键词时返回单个未命中片段', () => {
    expect(splitByKeyword('报名截止 12 月 10 日', '')).toEqual([
      { text: '报名截止 12 月 10 日', hit: false },
    ])
  })

  it('把命中的句子单独切出来并保留原文大小写', () => {
    const segments = splitByKeyword('请于 2026 年 12 月 10 日前提交材料。', '2026 年 12 月 10 日')
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual(['2026 年 12 月 10 日'])
    expect(segments.map((s) => s.text).join('')).toBe('请于 2026 年 12 月 10 日前提交材料。')
  })

  it('关键词未命中时整体不切分', () => {
    const segments = splitByKeyword('讲座向全校师生开放', '不存在的词')
    expect(segments).toEqual([{ text: '讲座向全校师生开放', hit: false }])
  })

  it('同一段出现多次时全部标记为命中', () => {
    const segments = splitByKeyword('报名报名报名', '报名')
    expect(segments.filter((s) => s.hit)).toHaveLength(3)
  })

  it('英文匹配大小写不敏感', () => {
    const segments = splitByKeyword('Deadline is 12-10', 'deadline')
    expect(segments[0]).toEqual({ text: 'Deadline', hit: true })
  })

  it('拼回片段后与原文完全一致（不丢字）', () => {
    const source = '第一段。第二段请携带学生证到校团委办公室现场报名。第三段。'
    const segments = splitByKeyword(source, '请携带学生证到校团委办公室现场报名')
    expect(segments.map((s) => s.text).join('')).toBe(source)
  })
})

describe('containsText', () => {
  it('正文包含证据原文时返回 true', () => {
    expect(containsText('请于 12 月 10 日前提交材料。', '12 月 10 日前')).toBe(true)
  })

  it('不包含或空值返回 false', () => {
    expect(containsText('请于 12 月 10 日前提交材料。', '12 月 20 日')).toBe(false)
    expect(containsText('正文', '   ')).toBe(false)
    expect(containsText('', '正文')).toBe(false)
  })
})
