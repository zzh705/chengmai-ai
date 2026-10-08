/** 活化实验室接口（POST /api/creation/generate） */
import { API_BASE } from './base'

export interface CreationResult {
  title: string
  slogan?: string
  traditional_elements: string[]
  modern_carrier: string[]
  spread_channels: string[]
  ai_parts: string[]
  steps: string[]
  guardrails: string[]
  /** 落地物料与资源准备 */
  materials?: string[]
  /** 执行风险与文化边界 */
  risks?: string[]
  /** 可量化成效标尺 */
  metrics?: string[]
}

export interface CreationResponse {
  code: number
  heritage: string
  result: CreationResult
  sources: string[]
}

export type OutputType = 'plan' | 'event' | 'video' | 'exhibit'
export type CreationStyle = 'guochao' | 'serious' | 'lively'
export type Audience = 'campus' | 'community' | 'overseas'

export interface CreationOptions {
  outputType?: OutputType
  style?: CreationStyle
  audience?: Audience
}

export async function generateCreation(
  heritage: string,
  requirement: string,
  opts: CreationOptions | OutputType = {},
  signal?: AbortSignal,
): Promise<CreationResponse> {
  const o: CreationOptions = typeof opts === 'string' ? { outputType: opts } : opts
  // 30s 前端超时兜底（后端 22s 超时 + 本地兜底，正常应在 5～22s 内返回）
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort('timeout'), 30_000)
  const onAbort = () => ctrl.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort)
  try {
    const resp = await fetch(`${API_BASE}/api/creation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heritage,
        requirement,
        output_type: o.outputType ?? 'plan',
        style: o.style ?? 'guochao',
        audience: o.audience ?? 'campus',
      }),
      signal: ctrl.signal,
    })
    if (!resp.ok) throw new Error(`方案生成失败：HTTP ${resp.status}`)
    return (await resp.json()) as CreationResponse
  } catch (e) {
    if (ctrl.signal.aborted) {
      if (signal?.aborted) throw new Error('已取消生成')
      throw new Error('方案生成超时，请检查网络后重试')
    }
    throw e instanceof Error ? e : new Error('方案生成失败，请重试')
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
