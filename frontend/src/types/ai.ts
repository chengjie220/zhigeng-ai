/** 「问知更」AI 问答的数据结构（对应 GET /api/v1/qa） */

/** 引用的一条原文依据 */
export interface QACitation {
  notice_id: number
  title: string
  category: string
  deadline_date: string | null
  deadline_time: string | null
  /** 逐字来自该通知正文的片段 */
  snippet: string
  original_url: string
}

export interface QAAnswer {
  question: string
  answer: string
  /** llm：模型回答；rule：未配置模型时基于检索的规则回答 */
  mode: 'llm' | 'rule'
  citations: QACitation[]
  candidate_ids: number[]
  disclaimer: string
}

/** 对话气泡 */
export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  citations?: QACitation[]
  mode?: 'llm' | 'rule'
  error?: boolean
}
