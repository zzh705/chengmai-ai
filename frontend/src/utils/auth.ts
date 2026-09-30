/**
 * 题名入馆会话：
 * 实名入馆走后端账号系统（名号 + 口令），令牌存本机 localStorage；
 * 游客入馆不建账号，仅存名号。与既有匿名进度 ID（chengmai_uid）并存，
 * 学习档案仍由进度接口承载。
 */

export interface Session {
  /** 用户题写的名号 */
  name: string
  /** 入馆时间戳（毫秒） */
  since: number
  /** 服务端令牌：实名入馆才有，游客为空 */
  token?: string
}

const KEY = 'chengmai_session'

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    if (!s || typeof s.name !== 'string' || !s.name.trim()) return null
    return s
  } catch {
    return null
  }
}

/** 落会话：实名入馆带令牌，游客不带 */
export function saveSession(name: string, token?: string): Session {
  const s: Session = { name: name.trim(), since: Date.now(), ...(token ? { token } : {}) }
  localStorage.setItem(KEY, JSON.stringify(s))
  return s
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}

/** 名号取最后一个汉字作为印章字 */
export function sealChar(name: string): string {
  const n = name.trim()
  return n ? n[n.length - 1] : '客'
}
