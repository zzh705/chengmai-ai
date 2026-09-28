import { useEffect, useState } from 'react'
import {
  generateCreation,
  type Audience,
  type CreationResponse,
  type CreationStyle,
  type OutputType,
} from '../api/creation'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { recordProgress } from '../api/progress'
import { useRevealGroup } from '../hooks/useReveal'
import '../styles/lab.css'

const OUTPUT_TYPES: { key: OutputType; label: string }[] = [
  { key: 'plan', label: '文创方案' },
  { key: 'event', label: '校园活动' },
  { key: 'video', label: '短视频脚本' },
  { key: 'exhibit', label: '展览策划' },
]

const STYLES: { key: CreationStyle; label: string }[] = [
  { key: 'guochao', label: '国潮融合' },
  { key: 'serious', label: '学术严谨' },
  { key: 'lively', label: '活泼轻趣' },
]

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'campus', label: '校园' },
  { key: 'community', label: '社区' },
  { key: 'overseas', label: '海外中文学习者' },
]

const PRESETS = [
  '做成校园社团可以落地的一周活动',
  '让外国朋友也能看懂并愿意分享',
  '设计一款年轻人愿意买的文创',
  '适合发在社交平台的互动创意',
]

interface HistoryItem {
  id: number
  heritage: string
  typeLabel: string
  title: string
  time: string
  data: CreationResponse
}

const HISTORY_KEY = 'lab_history'

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export default function Lab() {
  const rootRef = useRevealGroup<HTMLDivElement>()
  const [list, setList] = useState<HeritageSummary[]>([])
  const [heritage, setHeritage] = useState('')
  const [requirement, setRequirement] = useState('')
  const [outputType, setOutputType] = useState<OutputType>('plan')
  const [style, setStyle] = useState<CreationStyle>('guochao')
  const [audience, setAudience] = useState<Audience>('campus')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(-1)
  const [result, setResult] = useState<CreationResponse | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHeritageList()
      .then((l) => {
        setList(l)
        if (l.length > 0) setHeritage(l[0].id)
      })
      .catch((e) => setError(e.message))
  }, [])

  // 结果区在表单+历史之下，生成后自动滚过去，否则用户看不到回答
  function scrollToResult() {
    setTimeout(() => {
      document.querySelector('.lab-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  async function handleGenerate() {
    if (!heritage || !requirement.trim() || loading) return
    setLoading(true)
    setError('')
    setStage(0)
    // 阶段反馈与真实请求并行推进，等待期不再是一段空白
    const timers = [800, 1800].map((ms, i) => window.setTimeout(() => setStage(i + 1), ms))
    try {
      const name = list.find((h) => h.id === heritage)?.name ?? heritage
      const resp = await generateCreation(name, requirement.trim(), {
        outputType,
        style,
        audience,
      })
      setResult(resp)
      scrollToResult()
      recordProgress('creation', { name })

      // 存入历史（最多 10 条）
      const item: HistoryItem = {
        id: Date.now(),
        heritage: name,
        typeLabel: OUTPUT_TYPES.find((t) => t.key === outputType)?.label ?? '',
        title: resp.result.title,
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        data: resp,
      }
      const next = [item, ...history].slice(0, 10)
      setHistory(next)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      timers.forEach(window.clearTimeout)
      setStage(-1)
      setLoading(false)
    }
  }

  function clearHistory() {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }

  const r = result?.result

  return (
    <div className="lab-page" ref={rootRef}>
      <header className="lab-header">
        <h1>非遗活化实验室</h1>
        <p>先检索传统文化依据，再生成现代化方案：创新不越界</p>
      </header>

      <div className="lab-form">
        <select value={heritage} onChange={(e) => setHeritage(e.target.value)}>
          {list.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}（{h.category.split('·')[0].trim()}）
            </option>
          ))}
        </select>

        <div className="lab-row">
          <div className="lab-opt">
            <label>方案类型</label>
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
          </div>
          <div className="lab-opt">
            <label>创作风格</label>
            <div className="lab-types">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  className={style === s.key ? 'active' : ''}
                  onClick={() => setStyle(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-opt">
            <label>目标受众</label>
            <div className="lab-types">
              {AUDIENCES.map((a) => (
                <button
                  key={a.key}
                  className={audience === a.key ? 'active' : ''}
                  onClick={() => setAudience(a.key)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea
          rows={3}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="描述你的创意需求，例如：把剪纸和现代校园文化结合，做一个有传播效果的社团活动…"
        />
        <div className="lab-presets">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setRequirement(p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="lab-actions">
          <button className="lab-generate" onClick={handleGenerate} disabled={loading}>
            {loading ? '实验室分析中…' : result ? '换一个方案' : '生成活化方案'}
          </button>
          {history.length > 0 && (
            <button className="lab-clear" onClick={clearHistory}>
              清空历史
            </button>
          )}
        </div>
        {error && <div className="lab-error">{error}</div>}
        {loading && (
          <div className="lab-stages">
            {['检索文化依据', '对齐传统语义', '生成创意方案'].map((s2, i) => (
              <span key={s2} className={i <= stage ? 'on' : ''}>
                <i>{String(i + 1).padStart(2, '0')}</i>
                {s2}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 历史方案 */}
      {history.length > 0 && (
        <div className="lab-history">
          <h3>
            历史方案 <em>（本地保存 {history.length} 条）</em>
          </h3>
          <div className="lab-history-list">
            {history.map((h) => (
              <button
                key={h.id}
                className={result?.result.title === h.title ? 'active' : ''}
                onClick={() => {
                  setResult(h.data)
                  scrollToResult()
                }}
              >
                <strong>{h.title}</strong>
                <span>
                  {h.heritage} · {h.typeLabel} · {h.time}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {r && result && (
        <div className="lab-result" key={r.title}>
          <div className="lab-result-head">
            <span className="lab-result-kicker">
              活化方案 · {OUTPUT_TYPES.find((t) => t.key === outputType)?.label} ·{' '}
              {STYLES.find((x) => x.key === style)?.label}
            </span>
            <h2>{r.title}</h2>
            {r.slogan && <div className="lab-slogan">「{r.slogan}」</div>}
            {result.sources.length > 0 && (
              <div className="lab-sources">文化依据 · {result.sources.join('、')}</div>
            )}
          </div>

          <section className="lab-guard reveal">
            <h3>文化护栏 · 不可随意改变的语义</h3>
            <ul>
              {r.guardrails.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>

          <div className="lab-grid">
            <section className="reveal">
              <span className="lab-sec-no">01</span>
              <h3>传统元素</h3>
              <ul>
                {r.traditional_elements.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
              <span className="lab-sec-no">02</span>
              <h3>现代载体</h3>
              <ul>
                {r.modern_carrier.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
              <span className="lab-sec-no">03</span>
              <h3>传播方式</h3>
              <ul>
                {r.spread_channels.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
              <span className="lab-sec-no">04</span>
              <h3>AI 可辅助</h3>
              <ul>
                {r.ai_parts.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="lab-steps reveal">
            <h3>可实施步骤</h3>
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
