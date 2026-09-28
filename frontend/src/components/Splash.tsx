import { useEffect, useRef, useState } from 'react'
import '../styles/splash.css'

/**
 * 开屏仪式动画：金线展开卷轴 → 品牌字浮现 → 印章落款 → 整体淡出。
 * 挂载 App 时播一次（路由切换不重播），可点击任意处或「跳过」立即结束。
 * 退出走 340ms 淡出（leaving）再卸载，与首页入场动画无缝衔接。
 */
export default function Splash({ onDone }: { onDone: () => void }) {
  // onDone 用 ref 保存：避免父组件每次渲染重建函数导致计时器被重置
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  const [leaving, setLeaving] = useState(false)
  // 防重入：点击/跳过/定时器可能同时触发，只允许第一次进入退场
  const leavingRef = useRef(false)

  function leave() {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    setTimeout(() => doneRef.current(), 340)
  }

  useEffect(() => {
    const t = setTimeout(() => leave(), 3400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} onClick={() => leave()} role="presentation">
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
          leave()
        }}
      >
        跳过 →
      </button>
    </div>
  )
}
