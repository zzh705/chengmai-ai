/** 学习路径接口（POST /api/learning-plan） */

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
): Promise<LearningPlan> {
  const o: PlanOptions = typeof opts === 'number' ? { days: opts } : opts
  const resp = await fetch('/api/learning-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      days: o.days ?? 7,
      level: 'beginner',
      goal: o.goal ?? 'understand',
      daily_minutes: o.dailyMinutes ?? 60,
    }),
  })
  if (!resp.ok) throw new Error(`学习路径生成失败：HTTP ${resp.status}`)
  return (await resp.json()) as LearningPlan
}
