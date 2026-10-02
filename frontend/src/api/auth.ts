/** 账号接口：POST /api/auth/register · POST /api/auth/login */
import { API_BASE } from './base'

export interface AuthSession {
  name: string
  token: string
}

interface AuthResp {
  detail?: string
  name?: string
  token?: string
}

async function request(
  path: string,
  body: { name: string; password: string },
): Promise<AuthSession> {
  const resp = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await resp.json().catch(() => null)) as AuthResp | null
  if (!resp.ok) {
    throw new Error(
      (typeof data?.detail === 'string' && data.detail) || `HTTP ${resp.status}`,
    )
  }
  if (!data?.name || !data?.token) throw new Error('馆方回执异常，请稍后再试')
  return { name: data.name, token: data.token }
}

/** 新客造册：名号查重 + 口令建档 */
export function registerAccount(name: string, password: string): Promise<AuthSession> {
  return request('/api/auth/register', { name, password })
}

/** 老客登馆：核对名号与口令 */
export function loginAccount(name: string, password: string): Promise<AuthSession> {
  return request('/api/auth/login', { name, password })
}
