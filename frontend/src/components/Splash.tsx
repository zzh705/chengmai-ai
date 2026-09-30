import { useEffect, useRef, useState } from 'react'
import '../styles/splash.css'

/**
 * 开屏仪式动画：金线展开卷轴 → 品牌字浮现 → 印章落款 → 整体淡出。
 * 挂载 App 时播一次（路由切换不重播），可点击任意处或「跳过」立即结束。
 * 退出走 340ms 淡出（leaving）再卸载，与首页入场动画无缝衔接。
 * 偏好减弱动效时首帧即不渲染（挂载即回调 onDone），不闪一帧。
 */
export default function Splash({ onDone }: { onDone: () => void }) {
  // onDone 用 ref 保存：避免父组件每次渲染重建函数导致计时器被重置
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  // 首帧前判定减弱动效偏好，保证 return null 不产生闪帧
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [leaving, setLeaving] = useState(false)
  // 跳过按钮入场动画结束（1.2s）前不可聚焦、不可点
  const [skipReady, setSkipReady] = useState(false)
  // 防重入：点击/跳过/定时器可能同时触发，只允许第一次进入退场
  const leavingRef = useRef(false)
  const leaveTimerRef = useRef(0)

  function leave() {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    leaveTimerRef.current = window.setTimeout(() => doneRef.current(), 340)
  }

  useEffect(() => {
    // 减弱动效：挂载即结束，由父级直接呈现首页
    if (reduced) {
      doneRef.current()
      return
    }
    const autoT = window.setTimeout(() => leave(), 3400)
    const skipT = window.setTimeout(() => setSkipReady(true), 1200)
    return () => {
      clearTimeout(autoT)
      clearTimeout(skipT)
      clearTimeout(leaveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (reduced) return null

  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} onClick={() => leave()} role="presentation">
      <div className="splash-stage">
        <div className="splash-line" aria-hidden />
        <div className="splash-word">承脉</div>
        <div className="splash-seal">承脉</div>
        <div className="splash-sub">非遗多智能体系统</div>
      </div>
      <button
        className={`splash-skip${skipReady ? ' ready' : ''}`}
        tabIndex={skipReady ? 0 : -1}
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
