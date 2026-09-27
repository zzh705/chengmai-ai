/**
 * 对话接口调用（字段严格对应 docs/api_contract.md）
 * 成员 B 只依赖本文件，不关心 AI 内部实现。
 */
import { mockChatResponse } from './mock'

export interface Source {
  id: string
  title: string
  publisher: string
  url: string
  publish_time: string
  reliability_level: string
}

export interface RelatedItem {
  id: string
  name: string
  type: string
}

export interface Action {
  type: string
  label: string
}

export interface EvidenceScore {
  relevance: number
  credibility: number
  coverage: number
  total: number
}

export interface ChatResponse {
  code: number
  session_id: string
  answer: string
  sources: Source[]
  related_items: RelatedItem[]
  actions: Action[]
  evidence_score: EvidenceScore
  intent: string
}

export interface ChatRequest {
  message: string
  mode: 'scholar' | 'inheritor' | 'youth'
  session_id?: string | null
  user_id?: string | null
}

/** 后端没起时改为 true，页面会用 mock 数据演示 */
const USE_MOCK = false

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600))
    return { ...mockChatResponse, answer: `【MOCK】${req.message}` }
  }

  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!resp.ok) {
    throw new Error(`请求失败：HTTP ${resp.status}`)
  }
  return (await resp.json()) as ChatResponse
}
