import { useEffect, useRef, useState } from 'react'
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
import Motif from '../components/Motif'
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
  /** 抄录方案的纸面反馈：成功/被浏览器拒绝 */
  const [copyOk, setCopyOk] = useState(false)
  const [copyError, setCopyError] = useState(false)
  /** 进行中生成的取消信号；接口本身不透传 signal，取消后仅丢弃迟到响应 */
  const abortRef = useRef<AbortController | null>(null)
  /** 阶段计时器 / 滚动计时器：卸载时清理 */
  const timersRef = useRef<number[]>([])
  const scrollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchHeritageList('deep')
      .then((l) => {
        if (cancelled) return
        setList(l)
        if (l.length > 0) setHeritage(l[0].id)
      })
      .catch((e) => {
        if (!cancelled) setError(`名录暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`)
      })
    return () => {
      cancelled = true
      abortRef.current?.abort()
      timersRef.current.forEach((t) => window.clearTimeout(t))
      if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
    }
  }, [])

  // 结果区在表单+历史之下，生成后自动滚过去，否则用户看不到回答；
  // 用户偏好减少动效时用瞬时滚动
  function scrollToResult() {
    scrollTimerRef.current = window.setTimeout(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document
        .querySelector('.lab-result')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      scrollTimerRef.current = null
    }, 80)
  }

  async function handleGenerate() {
    if (!heritage || !requirement.trim() || loading) return
    setLoading(true)
    setError('')
    setStage(0)
    // 阶段反馈与真实请求并行推进，等待期不再是一段空白
    timersRef.current = [700, 1600, 2500].map((ms) =>
      window.setTimeout(() => setStage((s) => s + 1), ms),
    )
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const name = list.find((h) => h.id === heritage)?.name ?? heritage
      const resp = await generateCreation(name, requirement.trim(), {
        outputType,
        style,
        audience,
      })
      // 用户已点「取消」：丢弃迟到响应，不再写入结果与历史
      if (ctrl.signal.aborted) return
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
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        /* 隐私模式/存储满：历史仅保留内存态 */
      }
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current = []
      if (abortRef.current === ctrl) abortRef.current = null
      setStage(-1)
      setLoading(false)
    }
  }

  function cancelGenerate() {
    abortRef.current?.abort()
  }

  function clearHistory() {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      /* 隐私模式：忽略 */
    }
  }

  /** 抄录整案：把结构化方案排成纯文本写入剪贴板，方便带去社团/课堂讨论 */
  async function copyPlan() {
    if (!result) return
    const L: string[] = []
    L.push(`《${r?.title}》活化方案`)
    if (r?.slogan) L.push(`口号：${r.slogan}`)
    L.push(`非遗项目：${result.heritage}`)
    if (result.sources.length) L.push(`文化依据：${result.sources.join('、')}`)
    const groups: [string, string[] | undefined][] = [
      ['文化护栏', r?.guardrails],
      ['传统元素', r?.traditional_elements],
      ['现代载体', r?.modern_carrier],
      ['传播方式', r?.spread_channels],
      ['AI 可辅助', r?.ai_parts],
      ['可实施步骤', r?.steps],
      ['物料与准备', r?.materials],
      ['风险与边界', r?.risks],
      ['成效标尺', r?.metrics],
    ]
    for (const [h, arr] of groups) {
      if (arr && arr.length) L.push(`\n${h}\n${arr.map((x, i) => `${i + 1}. ${x}`).join('\n')}`)
    }
    try {
      await navigator.clipboard.writeText(L.join('\n'))
      setCopyOk(true)
      window.setTimeout(() => setCopyOk(false), 2400)
    } catch {
      setCopyOk(false)
      setCopyError(true)
      window.setTimeout(() => setCopyError(false), 2600)
    }
  }

  const r = result?.result

  return (
    <div className="lab-page" ref={rootRef}>
      <header className="lab-header">
        <h1>非遗活化实验室</h1>
        <p>先检索传统文化依据，再生成现代化方案：创新不越界</p>
      </header>

      <div className="lab-form">
        <select
          value={heritage}
          onChange={(e) => setHeritage(e.target.value)}
          aria-label="选择要活化的非遗项目"
        >
          {list.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}（{h.category.split('·')[0].trim()}）
            </option>
          ))}
        </select>

        <div className="lab-row">
          <div className="lab-opt" role="group" aria-label="方案类型">
            <span className="lab-opt-label">方案类型</span>
            <div className="lab-types">
              {OUTPUT_TYPES.map((t) => (
                <button
                  key={t.key}
                  className={outputType === t.key ? 'active' : ''}
                  onClick={() => setOutputType(t.key)}
                  aria-pressed={outputType === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-opt" role="group" aria-label="创作风格">
            <span className="lab-opt-label">创作风格</span>
            <div className="lab-types">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  className={style === s.key ? 'active' : ''}
                  onClick={() => setStyle(s.key)}
                  aria-pressed={style === s.key}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-opt" role="group" aria-label="目标受众">
            <span className="lab-opt-label">目标受众</span>
            <div className="lab-types">
              {AUDIENCES.map((a) => (
                <button
                  key={a.key}
                  className={audience === a.key ? 'active' : ''}
                  onClick={() => setAudience(a.key)}
                  aria-pressed={audience === a.key}
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
          aria-label="创意需求描述"
        />
        <div className="lab-presets">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setRequirement(p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="lab-actions">
          <button
            className="lab-generate"
            onClick={loading ? cancelGenerate : handleGenerate}
            aria-busy={loading}
          >
            {loading ? '取消' : result ? '换一个方案' : '生成活化方案'}
          </button>
          {history.length > 0 && (
            <button className="lab-clear" onClick={clearHistory}>
              清空历史
            </button>
          )}
        </div>
        {error && (
          <div className="lab-error" role="alert">
            <span>{error}</span>
            <button className="lab-error-retry" onClick={handleGenerate}>
              重试
            </button>
          </div>
        )}
        {loading && (
          <div className="lab-stages" aria-live="polite" aria-busy={loading}>
            {['检索文化依据', '对齐传统语义', '编排创意方案', '补全落地清单'].map((s2, i) => (
              <span key={s2} className={i <= stage ? 'on' : ''}>
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
              <h3>传统元素</h3>
              <ul>
                {r.traditional_elements.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
              <h3>现代载体</h3>
              <ul>
                {r.modern_carrier.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
              <h3>传播方式</h3>
              <ul>
                {r.spread_channels.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
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

          {/* 落地双卷：物料与准备 / 成效标尺（旧历史无此字段时不渲染） */}
          {(r.materials?.length || r.metrics?.length) && (
            <div className="lab-duo">
              {r.materials?.length ? (
                <section className="lab-materials reveal">
                  <h3>物料与准备</h3>
                  <ul>
                    {r.materials.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </section>
              ) : (
                <span />
              )}
              {r.metrics?.length ? (
                <section className="lab-metrics reveal">
                  <h3>成效标尺</h3>
                  <ul>
                    {r.metrics.map((m, i) => (
                      <li key={i}>
                        <span className="lab-metric-dot" aria-hidden />
                        {m}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <span />
              )}
            </div>
          )}

          {r.risks?.length ? (
            <section className="lab-risks reveal">
              <h3>风险与边界</h3>
              <ul>
                {r.risks.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="lab-result-foot reveal">
            <button className="lab-copy" onClick={copyPlan}>
              {copyOk ? '已抄录，可粘贴至别处' : copyError ? '浏览器未允许复制，请手动选取' : '抄录整案'}
            </button>
            <span className="lab-result-seal" aria-hidden>
              承
            </span>
          </div>
        </div>
      )}

      {/* 水袖双影：两侧戏曲剪影，随指针轻摆，点击甩出墨金（纯装饰，不进交互焦点） */}
      <Motif kind="opera" />
    </div>
  )
}
