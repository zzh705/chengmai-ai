/** 用户传承档案接口（POST /api/user/progress, GET /api/user/profile/{id}） */
import { API_BASE } from './base'
import { uuid } from '../utils/id'

export type ProgressType = 'view' | 'learning_plan' | 'quiz_answer' | 'creation'

export interface ProfileStats {
  viewed_items: number
  learning_plans: number
  quiz_answered: number
  creations: number
}

export interface Profile {
  user_id: string
  stats: ProfileStats
  viewed: { item_id: string; name: string; count: number }[]
  learning_plans: { topic: string; ts: string }[]
  quiz: { answered: number; correct: number; accuracy: number }
  quiz_by_topic: { topic: string; answered: number; correct: number; accuracy: number }[]
  creations: { topic: string; ts: string }[]
  interests: { category: string; count: number }[]
  /** 近 28 天足迹（按天聚合的事件数，档案页热力日历用） */
  activity: { date: string; count: number }[]
  /** 最近足迹（新的在前），档案页时间轴用 */
  recent_events: { type: string; name: string; ts: string }[]
}

/** 匿名用户 ID：首次生成后存 localStorage，保证档案可跨会话延续 */
export function getUserId(): string {
  let uid = localStorage.getItem('chengmai_uid')
  if (!uid) {
    uid = `u_${uuid().slice(0, 8)}`
    localStorage.setItem('chengmai_uid', uid)
  }
  return uid
}

/** 记录进度（失败静默，不打扰用户） */
export function recordProgress(
  eventType: ProgressType,
  item?: { id?: string; name?: string },
  detail?: Record<string, unknown>,
): void {
  void fetch(`${API_BASE}/api/user/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: getUserId(),
      event_type: eventType,
      item_id: item?.id ?? null,
      item_name: item?.name ?? null,
      detail: detail ?? null,
    }),
  }).catch(() => {})
}

export async function fetchProfile(): Promise<Profile> {
  const resp = await fetch(`${API_BASE}/api/user/profile/${getUserId()}`)
  if (!resp.ok) throw new Error(`档案加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as Profile
}
