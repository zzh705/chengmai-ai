import { useEffect, useState } from 'react'

/** 数字滚动：挂载/值变化后 0 → value 缓动（easeOutCubic），视觉上的"跳动数字" */
export default function CountUp({
  value,
  dur = 900,
  className,
}: {
  value: number
  dur?: number
  className?: string
}) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, dur])
  return <span className={className} aria-label={String(value)}>{n}</span>
}
