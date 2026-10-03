import { useEffect, useRef } from 'react'
import { subscribeTheme } from '../utils/theme'
import '../styles/splash.css'

interface Ember {
  x: number
  y: number
  r: number
  vy: number
  drift: number
  phase: number
  alpha: number
  /** 少量朱火色粒子（约 30%），其余为金色 */
  warm: boolean
}

/**
 * 星火粒子背景：金色微粒自下缓缓升腾、左右轻摆，取"薪火相传"之意。
 * active=false 时画布留白（开屏期间不抢戏），激活后粒子从画面底部诞生、缓缓升起渐亮。
 * 纯 canvas 绘制（不产生 React 状态）：循环随 active 启停，步进按真实帧间隔归一化，
 * 高刷屏不快放；卸载时取消动画帧。
 */
export default function EmberCanvas({ active = true }: { active?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  const starterRef = useRef<{ start: () => void } | null>(null)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let alive = true
    let running = false
    let last = 0
    const dpr = window.devicePixelRatio || 1

    // 粒子色随主题走：暗墨=金/朱火星，亮纸=深金/沉朱光尘（读 RGB 通道令牌）
    const readRgb = (name: string): string =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '232, 197, 107'
    let goldRgb = readRgb('--gold-rgb')
    let redRgb = readRgb('--red-rgb')
    const offTheme = subscribeTheme(() => {
      goldRgb = readRgb('--gold-rgb')
      redRgb = readRgb('--red-rgb')
    })

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (w === 0 || h === 0) return
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => host.clientWidth
    const H = () => host.clientHeight
    // 随机参数生成一次，渲染期不重算（避免每次绘制抖动）
    const spawn = (atBottom: boolean): Ember[] =>
      Array.from({ length: 42 }, () => ({
        x: Math.random(),
        y: atBottom ? 1.02 + Math.random() * 0.5 : Math.random(),
        r: 0.7 + Math.random() * 1.6,
        vy: 0.06 + Math.random() * 0.13, // 更缓的升腾（约 5~9 秒穿越画面）
        drift: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.22 + Math.random() * 0.45,
        warm: Math.random() < 0.3, // 三成朱火
      }))
    let parts = spawn(false)

    let t = 0
    let armed = false
    let bornAt = 0

    const draw = (now: number) => {
      if (!alive || !running) return
      // 真实帧间隔归一化（dt/16.7 隐含在各位移量中）：120Hz 下每帧位移减半，不快放
      const dt = last ? Math.min(now - last, 50) : 16.7
      last = now
      t += dt / 1000
      ctx.clearRect(0, 0, W(), H())
      if (!activeRef.current) {
        // 失活即停循环，不空转 rAF；active 翻转时由外部 effect 重新 start
        running = false
        raf = 0
        return
      }
      if (!armed) {
        // 激活瞬间：粒子回到画面下方，随时间缓缓浮现（与开屏淡出衔接）
        parts = spawn(true)
        armed = true
        bornAt = now
      }
      const ramp = Math.min(1, (now - bornAt) / 2400) // 入场 2.4s 渐发
      for (const p of parts) {
        p.y -= (p.vy / Math.max(1, H())) * dt
        if (p.y < -0.05) {
          p.y = 1.05
          p.x = Math.random()
        }
        const x = p.x * W() + Math.sin(t * p.drift + p.phase) * 12
        const y = p.y * H()
        // 越接近顶部越淡；warm 粒子取朱火色，与注释口径一致
        const a = p.alpha * (0.35 + 0.65 * p.y) * ramp
        if (a < 0.01) continue
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.warm
          ? `rgba(${redRgb}, ${(a * 0.55).toFixed(3)})`
          : `rgba(${goldRgb}, ${a.toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    const start = () => {
      if (!alive || running || !activeRef.current) return
      running = true
      last = 0
      raf = requestAnimationFrame(draw)
    }
    starterRef.current = { start }
    start()

    const onVis = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
        raf = 0
      } else {
        start()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      alive = false
      running = false
      cancelAnimationFrame(raf)
      starterRef.current = null
      offTheme()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // active 翻转时启停循环，失活期间不产生空转帧
  useEffect(() => {
    if (active) starterRef.current?.start()
  }, [active])

  return <canvas ref={ref} className="ember-canvas" aria-hidden />
}
