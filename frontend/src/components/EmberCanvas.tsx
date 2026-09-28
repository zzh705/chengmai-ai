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
}

/**
 * 星火粒子背景：金色微粒自下缓缓升腾、左右轻摆，取"薪火相传"之意。
 * 纯 canvas 绘制（不产生 React 状态），卸载时取消动画帧。
 */
export default function EmberCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

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
    // 模块级随机数生成一次，渲染期不重算（避免每次绘制抖动）
    const parts: Ember[] = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.8 + Math.random() * 1.9,
      vy: 0.12 + Math.random() * 0.35,
      drift: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.5,
    }))

    let t = 0
    const draw = () => {
      if (!alive) return
      t += 0.016
      ctx.clearRect(0, 0, W(), H())
      for (const p of parts) {
        p.y -= p.vy / Math.max(1, H()) * 1000 * 0.016
        if (p.y < -0.05) {
          p.y = 1.05
          p.x = Math.random()
        }
        const x = p.x * W() + Math.sin(t * p.drift + p.phase) * 14
        const y = p.y * H()
        // 越接近顶部越淡
        const fade = 0.35 + 0.65 * p.y
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232, 197, 107, ${(p.alpha * fade).toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="ember-canvas" aria-hidden />
}
