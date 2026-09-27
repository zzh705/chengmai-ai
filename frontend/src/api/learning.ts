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

export async function fetchLearningPlan(topic: string, days = 7): Promise<LearningPlan> {
  const resp = await fetch('/api/learning-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, days, level: 'beginner' }),
  })
  if (!resp.ok) throw new Error(`学习路径生成失败：HTTP ${resp.status}`)
  return (await resp.json()) as LearningPlan
}
