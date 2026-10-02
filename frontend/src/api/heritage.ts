/** 非遗知识库接口（GET /api/heritage） */
import { API_BASE } from './base'

export interface HeritageSummary {
  id: string
  name: string
  category: string
  region: string
  level: string
  image: string
  /** 是否有真实配图；false 的条目在知识库中已沉底，首页推荐位亦排除 */
  has_image: boolean
  /** 一句话悬念钩子（卡片展示） */
  hook: string
  /** deep=深读档案 / index=全国名录索引 */
  tier: string
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

export async function fetchHeritageList(tier?: 'all' | 'deep' | 'index'): Promise<HeritageSummary[]> {
  const resp = await fetch(`${API_BASE}/api/heritage${tier && tier !== 'all' ? `?tier=${tier}` : ''}`)
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
  const resp = await fetch(`${API_BASE}/api/heritage/${id}`)
  if (!resp.ok) throw new Error(`详情加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as HeritageDetail
}
