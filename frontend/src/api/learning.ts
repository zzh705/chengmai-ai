/** 学习路径接口（POST /api/learning-plan） */
import { API_BASE } from './base'

export interface LearningDay {
  day: number
  title: string
  tasks: string[]
}

export interface LearningPlan {
  topic: string
  days: LearningDay[]
  sources: string[]
}

export type PlanGoal = 'understand' | 'master' | 'teach'

export interface PlanOptions {
  days?: number
  goal?: PlanGoal
  dailyMinutes?: number
}

export async function fetchLearningPlan(
  topic: string,
  opts: PlanOptions | number = {},
  signal?: AbortSignal,
): Promise<LearningPlan> {
  const o: PlanOptions = typeof opts === 'number' ? { days: opts } : opts
  // 75s 前端超时兜底（后端短超时+重试+本地兜底，正常应在 30s 内返回）
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort('timeout'), 75_000)
  const onAbort = () => ctrl.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort)
  try {
    const resp = await fetch(`${API_BASE}/api/learning-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        days: o.days ?? 7,
        level: 'beginner',
        goal: o.goal ?? 'understand',
        daily_minutes: o.dailyMinutes ?? 60,
      }),
      signal: ctrl.signal,
    })
    if (!resp.ok) throw new Error(`学习路径生成失败：HTTP ${resp.status}`)
    return (await resp.json()) as LearningPlan
  } catch (e) {
    if (ctrl.signal.aborted) {
      if (signal?.aborted) throw new Error('已取消生成')
      throw new Error('生成超时，请检查网络后重试')
    }
    throw e instanceof Error ? e : new Error('学习路径生成失败，请重试')
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
