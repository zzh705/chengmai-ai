import { useEffect, useRef } from 'react'

/**
 * 区块滚动渐入：给容器挂一次，内部 `.reveal` 元素滚动进入视口时加 `.revealed`（一次性）。
 * deps 变化（如异步数据到达后重新渲染）会重新收集尚未揭示的元素。
 */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -24px 0px' },
    )
    root.querySelectorAll('.reveal:not(.revealed)').forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}
