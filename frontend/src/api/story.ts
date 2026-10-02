/** 故事生成接口（POST /api/story/generate） */
import { API_BASE } from './base'

export interface StorySection {
  heading: string
  content: string
}

export interface StoryResponse {
  code: number
  topic: string
  title: string
  sections: StorySection[]
  spread_tips: string[]
  sources: string[]
}

export async function generateStory(
  topic: string,
  audience = '大学生',
  minutes = 2,
): Promise<StoryResponse> {
  const resp = await fetch(`${API_BASE}/api/story/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, audience, minutes, mode: 'youth' }),
  })
  if (!resp.ok) throw new Error(`故事生成失败：HTTP ${resp.status}`)
  return (await resp.json()) as StoryResponse
}
