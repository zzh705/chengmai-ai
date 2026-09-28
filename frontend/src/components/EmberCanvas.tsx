import { useEffect, useRef } from 'react'
import '../styles/splash.css'

interface Ember {
  x: number
  y: number
  r: number
  vy: number
  drift: number
  phase: number
  alpha: number
  warm: boolean
}

/**
 * 星火粒子背景：金色微粒自下缓缓升腾、左右轻摆，取"薪火相传"之意。
 * active=false 时画布留白（开屏期间不抢戏），激活后粒子从画面底部诞生、缓缓升起渐亮。
 * 纯 canvas 绘制（不产生 React 状态），卸载时取消动画帧。
 */
export default function EmberCanvas({ active = true }: { active?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let alive = true
    const dpr = window.devicePixelRatio || 1

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
        vy: 0.06 + Math.random() * 0.13, // 更缓的升腾（约 5–9 秒穿越画面）
        drift: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.22 + Math.random() * 0.45,
        warm: Math.random() < 0.3, // 少量暖橙火星
      }))
    let parts = spawn(false)

    let t = 0
    let armed = false
    let bornAt = 0
    const draw = (now: number) => {
      if (!alive) return
      t += 0.016
      ctx.clearRect(0, 0, W(), H())
      if (!activeRef.current) {
        raf = requestAnimationFrame(draw)
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
        p.y -= (p.vy / Math.max(1, H())) * 1000 * 0.016
        if (p.y < -0.05) {
          p.y = 1.05
          p.x = Math.random()
        }
        const x = p.x * W() + Math.sin(t * p.drift + p.phase) * 12
        const y = p.y * H()
        // 越接近顶部越淡
        const a = p.alpha * (0.35 + 0.65 * p.y) * ramp
        if (a < 0.01) continue
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.warm
          ? `rgba(217, 138, 84, ${a.toFixed(3)})`
          : `rgba(232, 197, 107, ${a.toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="ember-canvas" aria-hidden />
}
