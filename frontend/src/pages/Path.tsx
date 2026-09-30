import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchLearningPlan, type LearningPlan, type PlanGoal } from '../api/learning'
import { recordProgress } from '../api/progress'
import { useRevealGroup } from '../hooks/useReveal'
import Motif from '../components/Motif'
import '../styles/path.css'

const DAYS = [3, 7, 14]
const MINUTES = [30, 60, 90]
const GOALS: { key: PlanGoal; label: string; desc: string }[] = [
  { key: 'understand', label: '入门了解', desc: '建立整体认知' },
  { key: 'master', label: '深入掌握', desc: '临摹研读与分析' },
  { key: 'teach', label: '讲给别人听', desc: '每天输出分享' },
]

/** 目标寄语：卷头一句师门口吻，三条路线各有说法 */
const GOAL_SAY: Record<PlanGoal, string> = {
  understand: '入门之要，在眼界先开。此路不求甚解，先与它日日相见，日久自然相亲。',
  master: '行家路无捷径，一手眼、一身心。此路临摹与拆解并重，愿你手上磨出真功夫。',
  teach: '能讲出来，才是真学会。此路每日留出输出的功课，把所学酿成自己的话。',
}

/** 功课三类：观（读看听闻）、习（练临摹记）、作（写讲创作），由任务措辞自动辨认 */
type TaskKind = '观' | '习' | '作'
function taskKind(t: string): TaskKind {
  if (/写|讲|分享|创作|设计|输出|录制|拍摄|拍一|做一|尝试|实践|制作|改编|排演|演一|录一/.test(t)) return '作'
  if (/练|临|摹|复练|背|记熟|熟悉|掌握|模仿|默写|背诵|推敲|拆解|研读/.test(t)) return '习'
  return '观'
}

export default function Path() {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [topic, setTopic] = useState('')
  const [days, setDays] = useState(7)
  const [goal, setGoal] = useState<PlanGoal>('understand')
  const [minutes, setMinutes] = useState(60)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(-1)
  const [plan, setPlan] = useState<LearningPlan | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('plan_checks') || '{}')
    } catch {
      return {}
    }
  })
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  /** 日卡折叠：未登记即默认展开，登记 false 为收起 */
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  /** 阶段计时器 / 秒表：卸载时统一清理，避免卸载后 setState */
  const timersRef = useRef<number[]>([])
  const intervalRef = useRef<number | null>(null)
  const rootRef = useRevealGroup<HTMLDivElement>([plan?.topic])

  useEffect(() => {
    let cancelled = false
    fetchHeritageList('deep')
      .then((l) => {
        if (!cancelled) setList(l)
      })
      .catch((e) => {
        if (!cancelled) setError(`名录暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`)
      })
    // 卸载：取消进行中的生成请求并清空所有计时器
    return () => {
      cancelled = true
      abortRef.current?.abort()
      timersRef.current.forEach((t) => window.clearTimeout(t))
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [])

  // 当前计划的勾选 key 前缀（换主题/天数/目标后互不干扰）
  const prefix = plan ? `plan:${plan.topic}:${plan.days.length}:${goal}:` : ''

  const toggle = (key: string) => {
    setChecks((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem('plan_checks', JSON.stringify(next))
      } catch {
        /* 隐私模式/存储满：仅保留内存态 */
      }
      return next
    })
  }

  const progress = useMemo(() => {
    if (!plan) return { total: 0, done: 0, pct: 0 }
    let total = 0
    let done = 0
    for (const d of plan.days) {
      d.tasks.forEach((_, i) => {
        total += 1
        if (checks[`${prefix}${d.day}-${i}`]) done += 1
      })
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [plan, checks, prefix])

  /** 卷头总览：日数 / 功课数 / 每日时辰 / 全程学时 */
  const overview = useMemo(() => {
    if (!plan) return null
    const hours = (plan.days.length * minutes) / 60
    return {
      days: plan.days.length,
      tasks: progress.total,
      minutes,
      hours: hours % 1 === 0 ? String(hours) : hours.toFixed(1),
    }
  }, [plan, minutes, progress.total])

  /** 里程碑：首日启程、中半精进、末日出师 */
  const milestoneOf = (day: number, n: number): string => {
    if (day === 1) return '启程'
    if (day === n) return '出师'
    if (n >= 5 && day === Math.ceil(n / 2)) return '精进'
    return ''
  }

  /** 抄录路线：整案纯文本入剪贴板（与活化实验室「抄录整案」同一用法） */
  async function copyPlan() {
    if (!plan) return
    const lines: string[] = [
      `「${plan.topic}」${plan.days.length} 天学习路线`,
      `目标：${GOALS.find((g) => g.key === goal)?.label ?? ''} · 每日 ${minutes} 分钟 · 共 ${progress.total} 项功课`,
      '',
    ]
    for (const d of plan.days) {
      lines.push(`第 ${d.day} 日 · ${d.title}`)
      d.tasks.forEach((t, i) => lines.push(`  ${checks[`${prefix}${d.day}-${i}`] ? '[x]' : '[ ]'} ${t}`))
      lines.push('')
    }
    if (plan.sources.length > 0) lines.push(`参考知识库：${plan.sources.join('、')}`)
    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  async function handleGenerate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    setError('')
    setStage(0)
    setElapsed(0)
    // 阶段反馈跟随真实节奏放慢，避免「三步走完却还在等」的假进度
    timersRef.current = [1200, 4000].map((ms, i) =>
      window.setTimeout(() => setStage(i + 1), ms),
    )
    intervalRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const p = await fetchLearningPlan(
        topic.trim(),
        { days, goal, dailyMinutes: minutes },
        ctrl.signal,
      )
      if (!ctrl.signal.aborted) {
        setPlan(p)
        setOpenDays({})
        setCopied(false)
      }
      recordProgress('learning_plan', { name: topic.trim() })
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current = []
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (abortRef.current === ctrl) abortRef.current = null
      setStage(-1)
      setLoading(false)
    }
  }

  function resetChecks() {
    const next: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(checks)) if (!k.startsWith(prefix)) next[k] = v
    setChecks(next)
    try {
      localStorage.setItem('plan_checks', JSON.stringify(next))
    } catch {
      /* 隐私模式/存储满：仅保留内存态 */
    }
  }

  return (
    <div className="path-page" ref={rootRef}>
      <header className="path-header">
        <h1>AI 学习路径</h1>
        <p>选定主题、目标与时长，生成循序渐进、可勾选打卡的传承学习计划</p>
      </header>

      <div className="path-form">
        <select
          value={list.some((h) => h.name === topic) ? topic : ''}
          onChange={(e) => setTopic(e.target.value)}
          aria-label="从收录项目中选择主题"
        >
          <option value="">从收录项目选择…</option>
          {list.map((h) => (
            <option key={h.id} value={h.name}>
              {h.name}
            </option>
          ))}
        </select>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="或直接输入任意主题，如：中国传统刺绣"
          aria-label="自定义学习主题"
        />

        <div className="path-opt-group" role="group" aria-label="学习目标">
          <span className="path-opt-label">学习目标</span>
          <div className="path-goals">
            {GOALS.map((g) => (
              <button
                key={g.key}
                className={goal === g.key ? 'active' : ''}
                onClick={() => setGoal(g.key)}
                title={g.desc}
                aria-pressed={goal === g.key}
              >
                {g.label}
                <em>{g.desc}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="path-opt-row">
          <div className="path-opt-group" role="group" aria-label="天数">
            <span className="path-opt-label">天数</span>
            <div className="path-days">
              {DAYS.map((d) => (
                <button
                  key={d}
                  className={days === d ? 'active' : ''}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                >
                  {d} 天
                </button>
              ))}
            </div>
          </div>
          <div className="path-opt-group" role="group" aria-label="每日投入">
            <span className="path-opt-label">每日投入</span>
            <div className="path-days">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  className={minutes === m ? 'active' : ''}
                  onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                >
                  {m} 分钟
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="path-generate"
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          title={topic.trim() ? '' : '请先选择或输入学习主题'}
        >
          {loading ? `规划中 · ${elapsed}s` : '生成学习路线'}
        </button>
        {loading && (
          <>
            <div className="path-stages" aria-live="polite" aria-busy={loading}>
              {['读取主题资料', '编排学习节奏', '撰写每日任务'].map((s2, i) => (
                <span key={s2} className={i <= stage ? 'on' : ''}>
                  {s2}
                </span>
              ))}
            </div>
            <div className="path-loading-foot">
              {elapsed >= 15 && <span>模型正在撰写，通常 10～30 秒完成</span>}
              <button className="path-cancel" onClick={() => abortRef.current?.abort()}>
                取消
              </button>
            </div>
          </>
        )}
        {error && (
          <div className="path-error" role="alert">
            <span>{error}</span>
            <button className="path-retry" onClick={handleGenerate}>
              重试
            </button>
          </div>
        )}
      </div>

      {plan && overview && (
        <div className="path-result reveal">
          {/* 卷头：题名、总览四格、师承寄语、资料行囊 */}
          <div className="path-scroll">
            <div className="path-scroll-head">
              <div>
                <span className="path-kicker">学习路线 · PLAN</span>
                <h2>
                  「{plan.topic}」{plan.days.length} 天学习路线
                </h2>
              </div>
              <button className="path-copy" onClick={copyPlan}>
                {copied ? '已抄录' : '抄录路线'}
              </button>
            </div>
            <div className="path-overview">
              <div>
                <em>{overview.days}</em>
                <span>日课程</span>
              </div>
              <div>
                <em>{overview.tasks}</em>
                <span>项功课</span>
              </div>
              <div>
                <em>{overview.minutes}</em>
                <span>分钟 / 日</span>
              </div>
              <div>
                <em>{overview.hours}</em>
                <span>学时全程</span>
              </div>
            </div>
            <p className="path-motto">{GOAL_SAY[goal]}</p>
            {plan.sources.length > 0 && (
              <div className="path-kit">
                <span className="path-kit-label">资料行囊</span>
                <div className="path-kit-tags">
                  {plan.sources.map((s) => (
                    <span key={s} className="path-kit-tag">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="path-progress">
            <div className="path-progress-bar">
              <div className="path-progress-fill" style={{ '--x': progress.pct / 100 } as React.CSSProperties} />
            </div>
            <span>
              已完成 {progress.done}/{progress.total} 项（{progress.pct}%）
            </span>
            <button className="path-reset" onClick={resetChecks}>
              重置进度
            </button>
          </div>

          <div className="path-timeline">
            {plan.days.map((d) => {
              const dayKeys = d.tasks.map((_, i) => `${prefix}${d.day}-${i}`)
              const dayDone = dayKeys.every((k) => checks[k])
              const open = openDays[d.day] !== false
              const ms = milestoneOf(d.day, plan.days.length)
              return (
                <div key={d.day} className={`path-node ${dayDone ? 'day-done' : ''}`}>
                  <div className="path-day-badge">{dayDone ? '毕' : String(d.day).padStart(2, '0')}</div>
                  <div className={`path-day-body ${open ? 'is-open' : ''}`}>
                    <button
                      className="path-day-head"
                      onClick={() =>
                        setOpenDays((p) => ({ ...p, [d.day]: p[d.day] === false }))
                      }
                      aria-expanded={open}
                    >
                      <strong>{d.title}</strong>
                      {ms && <span className={`path-ms path-ms-${ms}`}>{ms}</span>}
                      <span className="path-day-time">约 {minutes} 分钟</span>
                      <span className="path-day-toggle" aria-hidden>
                        {open ? '收' : '展'}
                      </span>
                    </button>
                    <ul>
                      {d.tasks.map((t, i) => {
                        const key = `${prefix}${d.day}-${i}`
                        const kind = taskKind(t)
                        return (
                          <li key={i} className={checks[key] ? 'task-done' : ''}>
                            <label>
                              <input
                                type="checkbox"
                                checked={!!checks[key]}
                                onChange={() => toggle(key)}
                              />
                              <i className={`path-check path-check-${kind}`} aria-hidden>
                                {kind}
                              </i>
                              <span>{t}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>

          {progress.pct === 100 && (
            <div className="path-finish">
              <span className="path-finish-seal" aria-hidden>
                成
              </span>
              <p>恭喜出师：全程功课已毕。去「非遗挑战」检验成果，或到「活化实验室」完成一件创作</p>
            </div>
          )}
        </div>
      )}

      <Motif kind="steps" />
    </div>
  )
}
