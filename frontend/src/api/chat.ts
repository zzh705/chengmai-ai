/**
 * 对话接口调用（字段严格对应 docs/api_contract.md）
 * 成员 B 只依赖本文件，不关心 AI 内部实现。
 */
import { mockChatResponse } from './mock'
import { API_BASE } from './base'

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

  const resp = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!resp.ok) {
    throw new Error(`请求失败：HTTP ${resp.status}`)
  }
  return (await resp.json()) as ChatResponse
}

/** 流式接口的 meta 事件：证据链先于答案到达 */
export type ChatMeta = Omit<ChatResponse, 'code' | 'answer'> & { type: 'meta' }

export interface StreamHandlers {
  onMeta: (meta: ChatMeta) => void
  onDelta: (text: string) => void
  onDone: () => void
}

/**
 * SSE 流式对话：meta（检索完成即送达）→ delta*（逐字渲染）→ done。
 * 首屏可见延迟 = 检索延迟（毫秒级），而非整个 LLM 生成周期。
 */
export async function streamChat(req: ChatRequest, handlers: StreamHandlers): Promise<void> {
  if (USE_MOCK) {
    const data = { ...mockChatResponse, answer: `【MOCK】${req.message}` }
    handlers.onMeta({ ...data, type: 'meta' })
    for (const ch of data.answer) {
      handlers.onDelta(ch)
      await new Promise((r) => setTimeout(r, 8))
    }
    handlers.onDone()
    return
  }

  const controller = new AbortController()
  // 看门狗：首包 10s / 字段间 15s 无数据即中止，交给上层回退非流接口
  let watchdog = setTimeout(() => controller.abort(), 10_000)
  const bump = (ms: number) => {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => controller.abort(), ms)
  }

  const resp = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal: controller.signal,
  })
  if (!resp.ok || !resp.body) {
    throw new Error(`请求失败：HTTP ${resp.status}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const emit = (line: string) => {
    if (!line.startsWith('data: ')) return
    bump(15_000)
    let payload: { type: string; text?: string }
    try {
      payload = JSON.parse(line.slice(6)) as { type: string; text?: string }
    } catch {
      return // 单帧损坏不中断整条流
    }
    if (payload.type === 'meta') handlers.onMeta(payload as { type: 'meta' } & ChatMeta)
    else if (payload.type === 'delta') handlers.onDelta(payload.text ?? '')
    else if (payload.type === 'done') handlers.onDone()
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bump(15_000)
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const ev of events) {
        const line = ev.split('\n').find((l) => l.startsWith('data: '))
        if (line) emit(line)
      }
    }
  } finally {
    clearTimeout(watchdog)
  }
}
