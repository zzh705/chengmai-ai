/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：暗墨/亮纸主题持久化与 data-theme 切换
 */
/**
 * 双主题：light 亮纸（默认初始风格，白色基调）/ ink 暗墨（手动切换的第二种风格）
 * 单一状态源 = documentElement[data-theme]，sessionStorage 会话内记忆（换标签页即回亮纸）；
 * Canvas/SVG 等非 CSS 渲染层通过 subscribeTheme 订阅后自行换色重绘。
 */
import { useEffect, useSyncExternalStore } from 'react'

export type Theme = 'ink' | 'light'

const KEY = 'cm-theme'
const listeners = new Set<(t: Theme) => void>()

/** 初始一律亮纸；仅当本标签页内手动切到暗墨后，刷新生效（新开页面仍从亮纸开始） */
function readStored(): Theme {
  try {
    return sessionStorage.getItem(KEY) === 'ink' ? 'ink' : 'light'
  } catch {
    return 'light'
  }
}

let current: Theme =
  typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') === 'ink'
      ? 'ink'
      : readStored()
    : 'light'

function applyDOM(t: Theme) {
  const el = document.documentElement
  el.setAttribute('data-theme', t)
  el.style.colorScheme = t === 'light' ? 'light' : 'dark'
}

export function getTheme(): Theme {
  return current
}

export function setTheme(t: Theme) {
  if (t === current) return
  current = t
  try {
    sessionStorage.setItem(KEY, t)
  } catch {
    /* 隐私模式：仅本会话生效 */
  }
  applyDOM(t)
  listeners.forEach((fn) => fn(t))
}

export function toggleTheme(): Theme {
  const next = current === 'light' ? 'ink' : 'light'
  setTheme(next)
  return next
}

export function subscribeTheme(fn: (t: Theme) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** React 组件订阅主题（切换即重渲染，适合内联 fill/color 的 SVG 场景） */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => subscribeTheme(cb),
    () => current,
    () => 'light' as Theme,
  )
}

/**
 * 主题切换的一瞬给全站颜色属性加过渡，避免通配 transition 长期拖累
 * hover/滚动等交互（见 index.css .theme-x）。reduced-motion 下不加。
 */
export function flashThemeTransition() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = document.documentElement
  el.classList.remove('theme-x')
  void el.offsetWidth
  el.classList.add('theme-x')
  window.setTimeout(() => el.classList.remove('theme-x'), 520)
}

/** 读取当前主题下的 CSS 令牌计算值（供 canvas 取色），带 alpha 时转 rgba。 */
export function themeVar(name: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const m = /^#([0-9a-f]{6})$/i.exec(raw)
  if (!m) return raw
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return alpha >= 1 ? raw : `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 供非 React 场景在组件内挂载主题监听 */
export function useThemeChange(fn: (t: Theme) => void) {
  useEffect(() => {
    return subscribeTheme(fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
