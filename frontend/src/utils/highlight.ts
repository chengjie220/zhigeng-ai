/** 正文片段：hit 为 true 表示该段命中了要高亮的关键词 */
export interface TextSegment {
  text: string
  hit: boolean
}

/**
 * 把正文按关键词切成若干片段，用于「点击原文依据 → 正文对应句子高亮」。
 * 大小写不敏感匹配，但返回的仍是原文（保留原始大小写）。
 * 关键词为空或未命中时，返回单个未命中片段，调用方无需特判。
 */
export function splitByKeyword(text: string, keyword: string): TextSegment[] {
  const source = text ?? ''
  const key = (keyword ?? '').trim()
  if (!source) return []
  if (!key) return [{ text: source, hit: false }]

  const segments: TextSegment[] = []
  const lowerSource = source.toLowerCase()
  const lowerKey = key.toLowerCase()
  let cursor = 0

  while (cursor < source.length) {
    const found = lowerSource.indexOf(lowerKey, cursor)
    if (found === -1) {
      segments.push({ text: source.slice(cursor), hit: false })
      break
    }
    if (found > cursor) {
      segments.push({ text: source.slice(cursor, found), hit: false })
    }
    segments.push({ text: source.slice(found, found + key.length), hit: true })
    cursor = found + key.length
  }

  return segments
}

/** 正文是否包含某段证据原文（用于判断「定位到正文」按钮是否可用） */
export function containsText(body: string, quote: string): boolean {
  const key = (quote ?? '').trim()
  if (!key) return false
  return (body ?? '').toLowerCase().includes(key.toLowerCase())
}
