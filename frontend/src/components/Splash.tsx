import { useEffect, useRef } from 'react'
import '../styles/splash.css'

/**
 * 开屏仪式动画：金线展开卷轴 → 品牌字浮现 → 印章落款 → 整体淡出。
 * 挂载 App 时播一次（路由切换不重播），可点击任意处或「跳过」立即结束。
 */
export default function Splash({ onDone }: { onDone: () => void }) {
  // onDone 用 ref 保存：避免父组件每次渲染重建函数导致计时器被重置
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 3400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="splash" onClick={() => doneRef.current()} role="presentation">
      <div className="splash-stage">
        <div className="splash-line" aria-hidden />
        <div className="splash-word">承脉</div>
        <div className="splash-seal">承脉</div>
        <div className="splash-sub">非遗多智能体系统</div>
      </div>
      <button
        className="splash-skip"
        onClick={(e) => {
          e.stopPropagation()
          doneRef.current()
        }}
      >
        跳过 →
      </button>
    </div>
  )
}
