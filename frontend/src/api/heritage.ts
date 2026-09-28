/** 非遗知识库接口（GET /api/heritage） */

export interface HeritageSummary {
  id: string
  name: string
  category: string
  region: string
  level: string
  image: string
  /** 一句话悬念钩子（卡片展示） */
  hook: string
}

/** 详情页数字亮点 */
export interface TimelineEvent {
  year: string
  event: string
}

export interface WowNumber {
  value: number
  suffix: string
  label: string
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
  /** 冷知识（详情页"你知道吗"卡片） */
  fun_facts: string[]
  story: string
  timeline: TimelineEvent[]
  /** 数字亮点 */
  wow_numbers: WowNumber[]
}

export async function fetchHeritageDetail(id: string): Promise<HeritageDetail> {
  const resp = await fetch(`/api/heritage/${id}`)
  if (!resp.ok) throw new Error(`详情加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as HeritageDetail
}
