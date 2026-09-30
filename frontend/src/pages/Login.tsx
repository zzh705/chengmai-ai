import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import EmberCanvas from '../components/EmberCanvas'
import { loginAccount, registerAccount } from '../api/auth'
import { saveSession, type Session } from '../utils/auth'
import '../styles/login.css'

/**
 * 题名入馆：登录仪式页（实名账号制）。
 * 名号 + 口令向服务端核验，通过后「钤印入馆」，朱印盖章的一瞬完成登录，
 * 随后由父级播放开屏动画；未造册的新客可切换「新客造册」当场登记。
 * 会话令牌存本机 localStorage，密码仅提交给后端、本地不落任何痕迹。
 */
type AuthMode = 'login' | 'register'

export default function Login({ onEnter }: { onEnter: (s: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'fill' | 'stamping' | 'signed'>('fill')
  const rootRef = useRef<HTMLDivElement>(null)
  /** 盖印/淡出计时器统一收集，卸载时清掉，避免离场后 setState */
  const timersRef = useRef<number[]>([])
  useEffect(
    () => () => {
      timersRef.current.forEach((id) => clearTimeout(id))
    },
    [],
  )
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** 墨晕随指针轻移（仅写 CSS 变量，不触发渲染；触屏与减弱动效下不启动） */
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduced || e.pointerType === 'touch') return
    const r = rootRef.current?.getBoundingClientRect()
    if (!r) return
    rootRef.current?.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    rootRef.current?.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  /** 盖印收尾：印章压下、纸面泛朱，随后整体淡出交给开屏动画 */
  function enter(s: Session) {
    setPhase('stamping')
    const stampMs = reduced ? 200 : 820
    const fadeMs = reduced ? 120 : 520
    timersRef.current.push(window.setTimeout(() => setPhase('signed'), stampMs))
    timersRef.current.push(window.setTimeout(() => onEnter(s), stampMs + fadeMs))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请先题写名号')
      return
    }
    if (trimmed.length > 12) {
      setError('名号最长 12 个字')
      return
    }
    if (pwd.length < 6) {
      setError('口令至少 6 位')
      return
    }
    setError('')
    setBusy(true)
    try {
      const s =
        mode === 'login'
          ? await loginAccount(trimmed, pwd)
          : await registerAccount(trimmed, pwd)
      const session = saveSession(s.name, s.token)
      enter(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : '入馆失败，请稍后再试')
      setBusy(false)
    }
  }

  function enterGuest() {
    if (busy) return
    enter(saveSession('游客'))
  }

  function switchMode(next: AuthMode) {
    if (mode === next || busy) return
    setMode(next)
    setError('')
  }

  return (
    <div
      ref={rootRef}
      className={`login-page phase-${phase}`}
      onPointerMove={onPointerMove}
    >
      <EmberCanvas active />

      {/* 浑天虚环：极缓自转的背景仪式感 */}
      <div className="login-ring" aria-hidden>
        <i className="login-ring-outer" />
        <i className="login-ring-inner" />
        <i className="login-ring-tick t1" />
        <i className="login-ring-tick t2" />
        <i className="login-ring-tick t3" />
        <i className="login-ring-tick t4" />
      </div>
      {/* 随指针移动的淡金墨晕 */}
      <div className="login-glow" aria-hidden />

      <div className="login-stage">
        <header className="login-head">
          <span className="login-kicker">国家级非物质文化遗产 · AI 智能体</span>
          <div className="login-title-row">
            <h1 className="login-title">承脉</h1>
            <span className="login-title-seal" aria-hidden>
              承脉
            </span>
          </div>
          <span className="login-rule" aria-hidden />
          <p className="login-subtitle">题名落款 · 让每一次问学都有来处</p>
        </header>

        <form className="login-paper" onSubmit={submit}>
          {/* 老客入馆 / 新客造册：一枚纸上的两枚签 */}
          <div className="login-tabs" role="tablist" aria-label="入馆方式">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'on' : ''}
              onClick={() => switchMode('login')}
            >
              入馆
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'on' : ''}
              onClick={() => switchMode('register')}
            >
              新客造册
            </button>
          </div>

          <label className="login-label" htmlFor="login-name">
            {mode === 'login' ? '名号' : '题写名号'}
          </label>
          <input
            id="login-name"
            className="login-input login-input-name"
            type="text"
            value={name}
            maxLength={12}
            autoComplete="off"
            placeholder={mode === 'login' ? '馆中登记的名号' : '如：青衫客'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
            disabled={phase !== 'fill' || busy}
          />
          <label className="login-label" htmlFor="login-pwd">
            口令
          </label>
          <input
            id="login-pwd"
            className="login-input login-input-pwd"
            type="password"
            value={pwd}
            maxLength={64}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="至少 6 位"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            onChange={(e) => {
              setPwd(e.target.value)
              if (error) setError('')
            }}
            disabled={phase !== 'fill' || busy}
          />
          <span className="login-brush" aria-hidden />
          {error ? (
            <p className="login-error" id="login-error" role="alert">
              {error}
            </p>
          ) : (
            <p className="login-hint">
              {mode === 'login'
                ? '名号与口令核验通过方可入馆'
                : '名号与加密口令将存入馆册，供日后登馆'}
            </p>
          )}

          <button
            className="login-seal-btn"
            type="submit"
            disabled={phase !== 'fill' || busy}
            aria-label={mode === 'login' ? '钤印入馆' : '题名造册'}
          >
            <span className="login-seal-face">
              {busy ? '核验中' : mode === 'login' ? '钤印入馆' : '题名造册'}
            </span>
            <span className="login-ink" aria-hidden />
          </button>

          <button
            className="login-guest"
            type="button"
            disabled={phase !== 'fill' || busy}
            onClick={enterGuest}
          >
            不题名，以游客身份入馆 →
          </button>
        </form>

        <p className="login-foot">承脉 AI · 三千二百九十九项国家级非遗 · 结构化知识库</p>
      </div>
    </div>
  )
}
