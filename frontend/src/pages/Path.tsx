import { useEffect, useMemo, useState } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchLearningPlan, type LearningPlan, type PlanGoal } from '../api/learning'
import { recordProgress } from '../api/progress'
import { useRevealGroup } from '../hooks/useReveal'
import '../styles/path.css'

const DAYS = [3, 7, 14]
const MINUTES = [30, 60, 90]
const GOALS: { key: PlanGoal; label: string; desc: string }[] = [
  { key: 'understand', label: '入门了解', desc: '建立整体认知' },
  { key: 'master', label: '深入掌握', desc: '临摹研读与分析' },
  { key: 'teach', label: '讲给别人听', desc: '每天输出分享' },
]

export default function Path() {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [topic, setTopic] = useState('')
  const [days, setDays] = useState(7)
  const [goal, setGoal] = useState<PlanGoal>('understand')
  const [minutes, setMinutes] = useState(60)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<LearningPlan | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('plan_checks') || '{}')
    } catch {
      return {}
    }
  })
  const [error, setError] = useState('')
  const rootRef = useRevealGroup<HTMLDivElement>([plan?.topic])

  useEffect(() => {
    fetchHeritageList()
      .then((l) => {
        setList(l)
        if (l.length > 0) setTopic(l[0].name)
      })
      .catch((e) => setError(e.message))
  }, [])

  // 当前计划的勾选 key 前缀（换主题/天数/目标后互不干扰）
  const prefix = plan ? `plan:${plan.topic}:${plan.days.length}:${goal}:` : ''

  const toggle = (key: string) => {
    setChecks((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('plan_checks', JSON.stringify(next))
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

  async function handleGenerate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const p = await fetchLearningPlan(topic.trim(), { days, goal, dailyMinutes: minutes })
      setPlan(p)
      recordProgress('learning_plan', { name: topic.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  function resetChecks() {
    const next: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(checks)) if (!k.startsWith(prefix)) next[k] = v
    setChecks(next)
    localStorage.setItem('plan_checks', JSON.stringify(next))
  }

  return (
    <div className="path-page" ref={rootRef}>
      <header className="path-header">
        <h1>AI 学习路径</h1>
        <p>选定主题、目标与时长，生成循序渐进、可勾选打卡的传承学习计划</p>
      </header>

      <div className="path-form">
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
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
        />

        <div className="path-opt-group">
          <label>学习目标</label>
          <div className="path-goals">
            {GOALS.map((g) => (
              <button
                key={g.key}
                className={goal === g.key ? 'active' : ''}
                onClick={() => setGoal(g.key)}
                title={g.desc}
              >
                {g.label}
                <em>{g.desc}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="path-opt-row">
          <div className="path-opt-group">
            <label>天数</label>
            <div className="path-days">
              {DAYS.map((d) => (
                <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
                  {d} 天
                </button>
              ))}
            </div>
          </div>
          <div className="path-opt-group">
            <label>每日投入</label>
            <div className="path-days">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  className={minutes === m ? 'active' : ''}
                  onClick={() => setMinutes(m)}
                >
                  {m} 分钟
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="path-generate" onClick={handleGenerate} disabled={loading}>
          {loading ? '规划中…' : '生成学习路线'}
        </button>
        {error && <div className="path-error">{error}</div>}
      </div>

      {plan && (
        <div className="path-result reveal">
          <h2>
            「{plan.topic}」{plan.days.length} 天学习路线
            {plan.sources.length > 0 && <span className="path-src">参考：{plan.sources.join('、')}</span>}
          </h2>

          <div className="path-progress">
            <div className="path-progress-bar">
              <div className="path-progress-fill" style={{ width: `${progress.pct}%` }} />
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
              return (
                <div key={d.day} className={`path-node ${dayDone ? 'day-done' : ''}`}>
                  <div className="path-day-badge">{dayDone ? '✓' : `D${d.day}`}</div>
                  <div className="path-day-body">
                    <strong>{d.title}</strong>
                    <ul>
                      {d.tasks.map((t, i) => {
                        const key = `${prefix}${d.day}-${i}`
                        return (
                          <li key={i} className={checks[key] ? 'task-done' : ''}>
                            <label>
                              <input
                                type="checkbox"
                                checked={!!checks[key]}
                                onChange={() => toggle(key)}
                              />
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
              恭喜完成全部学习路线！去「非遗挑战」检验成果，或到「活化实验室」完成创作 →
            </div>
          )}
        </div>
      )}
    </div>
  )
}
