/** 非遗知识库接口（GET /api/heritage） */

export interface HeritageSummary {
  id: string
  name: string
  category: string
  region: string
  level: string
}

export async function fetchHeritageList(): Promise<HeritageSummary[]> {
  const resp = await fetch('/api/heritage')
  if (!resp.ok) throw new Error(`知识库加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as HeritageSummary[]
}
