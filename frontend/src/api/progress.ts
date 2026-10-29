/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：传承档案接口客户端：进度事件上报与档案读取
 */
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

/** 获取或生成匿名用户 ID（用于进度记录与档案查询）
 *  实名登录用户的进度直接用名号作为 uid，与账号绑定；
 *  游客保留随机匿名 uid。切换账号时进度自然跟随名号。 */
export function getUserId(): string {
  // 实名登录：进度绑定到名号
  try {
    const raw = localStorage.getItem('chengmai_session')
    if (raw) {
      const s = JSON.parse(raw)
      if (s && typeof s.name === 'string' && s.name.trim() && s.name !== '游客') {
        return s.name.trim()
      }
    }
  } catch {
    /* 会话解析失败：回退到匿名 uid */
  }
  // 游客：用匿名 uid
  let uid = localStorage.getItem('chengmai_uid')
  if (!uid) {
    uid = `u_${uuid().slice(0, 8)}`
    localStorage.setItem('chengmai_uid', uid)
  }
  return uid
}

/** 记录进度（失败静默，不打扰用户）；需要随后读档案时可 await，避免写后读竞态 */
export function recordProgress(
  eventType: ProgressType,
  item?: { id?: string; name?: string },
  detail?: Record<string, unknown>,
): Promise<void> {
  return fetch(`${API_BASE}/api/user/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: getUserId(),
      event_type: eventType,
      item_id: item?.id ?? null,
      item_name: item?.name ?? null,
      detail: detail ?? null,
    }),
  })
    .then(() => undefined)
    .catch(() => undefined)
}

export async function fetchProfile(): Promise<Profile> {
  const resp = await fetch(`${API_BASE}/api/user/profile/${getUserId()}`)
  if (!resp.ok) throw new Error(`档案加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as Profile
}
