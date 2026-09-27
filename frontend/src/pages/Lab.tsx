import { useEffect, useState } from 'react'
import { generateCreation, type CreationResponse } from '../api/creation'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import '../styles/lab.css'

const OUTPUT_TYPES = [
  { key: 'plan', label: '文创方案' },
  { key: 'event', label: '校园活动' },
  { key: 'video', label: '短视频脚本' },
] as const

export default function Lab() {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [heritage, setHeritage] = useState('')
  const [requirement, setRequirement] = useState('')
  const [outputType, setOutputType] = useState<'plan' | 'event' | 'video'>('plan')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CreationResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHeritageList()
      .then((l) => {
        setList(l)
        if (l.length > 0) setHeritage(l[0].id)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function handleGenerate() {
    if (!heritage || !requirement.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const name = list.find((h) => h.id === heritage)?.name ?? heritage
      setResult(await generateCreation(name, requirement.trim(), outputType))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const r = result?.result

  return (
    <div className="lab-page">
      <header className="lab-header">
        <h1>非遗活化实验室</h1>
        <p>先检索传统文化依据，再生成现代化方案 —— 创新不越界</p>
      </header>

      <div className="lab-form">
        <select value={heritage} onChange={(e) => setHeritage(e.target.value)}>
          {list.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}（{h.category.split('·')[0].trim()}）
            </option>
          ))}
        </select>
        <div className="lab-types">
          {OUTPUT_TYPES.map((t) => (
            <button
              key={t.key}
              className={outputType === t.key ? 'active' : ''}
              onClick={() => setOutputType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="描述你的创意需求，例如：把剪纸和现代校园文化结合，做一个有传播效果的社团活动…"
        />
        <button className="lab-generate" onClick={handleGenerate} disabled={loading}>
          {loading ? '实验室分析中…' : '生成活化方案'}
        </button>
        {error && <div className="lab-error">{error}</div>}
      </div>

      {r && result && (
        <div className="lab-result">
          <h2>{r.title}</h2>
          {result.sources.length > 0 && (
            <div className="lab-sources">📚 文化依据：{result.sources.join('、')}</div>
          )}

          <section className="lab-guard">
            <h3>⚠ 文化护栏 · 不可随意改变的语义</h3>
            <ul>
              {r.guardrails.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>

          <div className="lab-grid">
            <section>
              <h3>🎭 传统元素</h3>
              <ul>
                {r.traditional_elements.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>📦 现代载体</h3>
              <ul>
                {r.modern_carrier.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>📢 传播方式</h3>
              <ul>
                {r.spread_channels.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>🤖 AI 可辅助</h3>
              <ul>
                {r.ai_parts.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="lab-steps">
            <h3>🗺 可实施步骤</h3>
            <ol>
              {r.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  )
}
