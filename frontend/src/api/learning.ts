/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：核心原创：学习路径请求按计划规模三档自适应超时（25/40/55 秒），杜绝大计划被前端提前掐断
 */
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
  // 后端按 5 天/片错峰并发生成，整体约 15-28s；按规模三档留足网络余量，
  // 避免大计划被前端提前 abort 后误报超时
  const days = o.days ?? 7
  const timeoutMs = days <= 7 ? 25_000 : days <= 14 ? 40_000 : 55_000
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort('timeout'), timeoutMs)
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
