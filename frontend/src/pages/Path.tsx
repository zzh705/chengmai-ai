import { useEffect, useState } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchLearningPlan, type LearningPlan } from '../api/learning'
import '../styles/path.css'

const DAYS = [3, 7, 14]

export default function Path() {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [topic, setTopic] = useState('')
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<LearningPlan | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHeritageList()
      .then((l) => {
        setList(l)
        if (l.length > 0) setTopic(l[0].name)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function handleGenerate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      setPlan(await fetchLearningPlan(topic.trim(), days))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="path-page">
      <header className="path-header">
        <h1>AI 学习路径</h1>
        <p>选定主题与天数，生成循序渐进的传承学习计划</p>
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
        <div className="path-days">
          {DAYS.map((d) => (
            <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>
              {d} 天
            </button>
          ))}
        </div>
        <button className="path-generate" onClick={handleGenerate} disabled={loading}>
          {loading ? '规划中…' : '生成学习路线'}
        </button>
        {error && <div className="path-error">{error}</div>}
      </div>

      {plan && (
        <div className="path-result">
          <h2>
            📅「{plan.topic}」{plan.days.length} 天学习路线
            {plan.sources.length > 0 && <span className="path-src">参考：{plan.sources.join('、')}</span>}
          </h2>
          <div className="path-timeline">
            {plan.days.map((d) => (
              <div key={d.day} className="path-node">
                <div className="path-day-badge">D{d.day}</div>
                <div className="path-day-body">
                  <strong>{d.title}</strong>
                  <ul>
                    {d.tasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
