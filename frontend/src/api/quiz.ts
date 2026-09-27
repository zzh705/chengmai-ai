/** 测验接口（POST /api/quiz/generate） */

export interface QuizQuestion {
  id: number
  type: 'choice' | 'judge'
  question: string
  options: string[]
  answer: string
  explanation: string
}

export interface QuizResponse {
  code: number
  topic: string
  questions: QuizQuestion[]
  sources: string[]
}

export async function generateQuiz(topic: string, count = 3): Promise<QuizResponse> {
  const resp = await fetch('/api/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, count, difficulty: 'medium' }),
  })
  if (!resp.ok) throw new Error(`测验生成失败：HTTP ${resp.status}`)
  return (await resp.json()) as QuizResponse
}
