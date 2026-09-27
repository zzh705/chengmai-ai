/** 非遗知识库接口（GET /api/heritage） */

export interface HeritageSummary {
  id: string
  name: string
  category: string
  region: string
  level: string
  image: string
}

export async function fetchHeritageList(): Promise<HeritageSummary[]> {
  const resp = await fetch('/api/heritage')
  if (!resp.ok) throw new Error(`知识库加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as HeritageSummary[]
}

export interface HeritageDetail extends HeritageSummary {
  era: string
  description: string
  cultural_meaning: string
  craft_process: string
  representative_works: string[]
  representative_inheritors: string[]
  sources: { id: string; title: string; publisher: string; url: string; reliability_level: string }[]
}

export async function fetchHeritageDetail(id: string): Promise<HeritageDetail> {
  const resp = await fetch(`/api/heritage/${id}`)
  if (!resp.ok) throw new Error(`详情加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as HeritageDetail
}
