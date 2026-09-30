import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  fetchHeritageDetail,
  fetchHeritageList,
  type HeritageDetail,
  type HeritageSummary,
  type WowNumber,
} from '../api/heritage'
import { recordProgress } from '../api/progress'
import { startAmbient, stopAmbient } from '../utils/ambient'
import { speechSupported, speak, stopSpeaking } from '../utils/speech'
import Cover from '../components/Cover'
import { useRevealGroup } from '../hooks/useReveal'
import Motif from '../components/Motif'
import '../styles/knowledge.css'

interface Credit {
  license?: string
  source?: string
}

/** credits.json 来源代码 → 展示署名（与 About 页图片管线声明一一对应） */
const SOURCE_LABEL: Record<string, string> = {
  commons: 'Wikimedia Commons',
  'commons-pool': 'Wikimedia Commons',
  openverse: 'Openverse',
  met: '大都会艺术博物馆 Open Access',
  cleveland: '克利夫兰艺术博物馆 Open Access',
  'dashscope-wanx-ai': 'AI 生成示意图 · 阿里云通义万相（非实景照片）',
}

function creditText(c: Credit): string {
  if (c.source === 'dashscope-wanx-ai') {
    return 'AI 生成示意图，非实景'
  }
  const platform = (c.source && SOURCE_LABEL[c.source]) || 'Wikimedia Commons'
  return `图片 · ${platform}${c.license ? ` · ${c.license}` : ''}`
}

/** 卡片键盘激活：Enter/空格触发，与 click 等价 */
const onActivate = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

/** 正文中的解释性破折号改为冒号（文案硬禁 em/en dash，兼容连续多个） */
const clean = (s: string) => s.replace(/[—–]+/g, '：')

/** 数字亮点：挂载后 0 → value 缓动滚动（easeOutCubic）；reduced-motion 直出终值 */
function WowNum({ value, suffix, label }: WowNumber) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(0)
  useEffect(() => {
    if (prefersReduced) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [prefersReduced, value])
  return (
    <div className="kb-wow-item">
      <em>
        {prefersReduced ? value : n}
        <i>{suffix}</i>
      </em>
      <span>{label}</span>
    </div>
  )
}

export default function Knowledge({
  openParam,
  onNavigate,
}: {
  openParam?: string
  onNavigate?: (page: string, query?: string) => void
}) {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  const [credits, setCredits] = useState<Record<string, Credit>>({})
  // kw:关键词 → 列表预填搜索（由 App 的 key 重挂载保证初始值即最终值）
  const [keyword, setKeyword] = useState(() =>
    openParam?.startsWith('kw:') ? openParam.slice(3) : '',
  )
  const [cat, setCat] = useState('全部')
  const [error, setError] = useState('')
  // 列表分页：数千条全国名录条目一次渲染会拖垮首屏；筛选变化在渲染期归零（React 官方模式）
  const [shown, setShown] = useState(60)
  const filterKey = `${cat}|${keyword}`
  const [shownFor, setShownFor] = useState(filterKey)
  if (shownFor !== filterKey) {
    setShownFor(filterKey)
    setShown(60)
  }
  // 语音讲解 / 背景音（懒初始化：SSR 不存在，浏览器支持即可见入口）
  const [canSpeech] = useState(() => speechSupported())
  const [speaking, setSpeaking] = useState(false)
  const [bgm, setBgm] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRevealGroup<HTMLDivElement>([detail?.id])

  // 离开页面时停掉朗读与背景音，避免后台出声
  useEffect(
    () => () => {
      stopSpeaking()
      stopAmbient()
    },
    [],
  )

  // 列表拉取独立成函数：错误态「重试」按钮复用
  function loadList() {
    setError('')
    fetchHeritageList().then(setList).catch((e) => setError(`知识库暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`))
  }

  useEffect(() => {
    loadList()
    fetch('/images/heritage/credits.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCredits)
      .catch(() => setCredits({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 项目 id → 直达详情（异步 setState，挂载时只跑一次）
  useEffect(() => {
    if (!openParam || openParam.startsWith('kw:')) return
    let cancelled = false
    fetchHeritageDetail(openParam)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        recordProgress('view', { id: d.id, name: d.name })
        if (pageRef.current) pageRef.current.scrollTop = 0
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [openParam])

  async function open(id: string) {
    stopSpeaking()
    setSpeaking(false)
    try {
      const d = await fetchHeritageDetail(id)
      setDetail(d)
      recordProgress('view', { id: d.id, name: d.name })
      if (pageRef.current) pageRef.current.scrollTop = 0
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }

  // 听讲解：朗读钩子 + 故事（无故事时读简介），随时可停
  function toggleListen() {
    if (!detail) return
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const narration = [detail.hook, detail.story || detail.description]
      .filter(Boolean)
      .join('。')
    const started = speak(narration, () => setSpeaking(false))
    setSpeaking(started)
  }

  function toggleBgm() {
    if (bgm) {
      stopAmbient()
      setBgm(false)
    } else {
      setBgm(startAmbient())
    }
  }

  const filtered = list.filter(
    (h) =>
      (cat === '全部' || h.category.split(' · ')[0] === cat) &&
      (h.name.includes(keyword) ||
        h.category.includes(keyword) ||
        h.region.includes(keyword)),
  )

  // 类别筛选芯片（全部 + 各大类）
  const cats = useMemo(() => {
    const set = new Set(list.map((h) => h.category.split(' · ')[0]))
    return ['全部', ...set]
  }, [list])

  if (detail) {
    const credit = credits[detail.id]
    const cat0 = detail.category.split(' · ')[0]
    // 相关推荐：同类别优先，不足则同地域补足，最多三张；图与实物不符的项不进推荐位
    const related = (() => {
      const sameCat = list.filter(
        (h) =>
          h.id !== detail.id &&
          h.has_image !== false &&
          h.category.split(' · ')[0] === cat0,
      )
      const sameRegion =
        sameCat.length >= 3
          ? []
          : list.filter(
              (h) =>
                h.id !== detail.id &&
                h.has_image !== false &&
                !sameCat.some((s) => s.id === h.id) &&
                h.region.includes(detail.region.split('（')[0].slice(0, 2)),
            )
      return [...sameCat, ...sameRegion].slice(0, 3)
    })()
    return (
      <div className="kb-page" ref={pageRef}>
        <div className="kb-detail" ref={detailRef}>
          <button className="kb-back" onClick={() => setDetail(null)}>
            ← 返回列表
          </button>
          <Cover item={detail} className="kb-detail-cover" />
          {credit && <div className="kb-cover-credit">{creditText(credit)}</div>}
          <h1>
            {detail.name}
            <span className="kb-level">{detail.level}</span>
          </h1>
          <div className="kb-meta">
            {[detail.category, detail.region].filter(Boolean).join(' · ')}
            {detail.era ? `（${detail.era}）` : ''}
          </div>

          {/* 聆听条：语音讲解 + 背景音 + 深入追问 AI（全部文字按钮，无小图标） */}
          <div className="kb-audio">
            {canSpeech && (
              <button className={speaking ? 'on' : ''} onClick={toggleListen}>
                {speaking ? '停止朗读' : '听讲解'}
              </button>
            )}
            <button className={bgm ? 'on' : ''} onClick={toggleBgm}>
              {bgm ? '背景音：开' : '背景音：关'}
            </button>
            {onNavigate && (
              <button
                className="kb-audio-ai"
                onClick={() => onNavigate('chat', `深入讲讲${detail.name}`)}
              >
                向承脉 AI 深入提问
              </button>
            )}
            {speaking && <span className="kb-audio-hint">朗读中</span>}
          </div>

          {/* 悬念钩子：详情页第一记视觉重拳 */}
          {detail.hook && <div className="kb-hook">「{clean(detail.hook)}」</div>}

          {/* 数字亮点：滚动计数大字 */}
          {detail.wow_numbers.length > 0 && (
            <div className="kb-wow">
              {detail.wow_numbers.map((w, i) => (
                <WowNum key={i} {...w} />
              ))}
            </div>
          )}

          {/* 一分钟讲述：叙事性沉浸阅读 */}
          {detail.story && (
            <div className="kb-story reveal">
              <div className="kb-story-title">
                一分钟认识<span>{detail.name}</span>
              </div>
              <p>{clean(detail.story)}</p>
            </div>
          )}

          {/* 大事年表：横向时间轴，节点逐个点亮 */}
          {detail.timeline.length > 0 && (
            <div className="kb-timeline reveal">
              <div className="kb-timeline-title">大事年表</div>
              <div className="kb-tl-track">
                {detail.timeline.map((t, i) => (
                  <div key={i} className="kb-tl-node" style={{ animationDelay: `${0.18 + i * 0.22}s` }}>
                    <span className="kb-tl-year">{t.year}</span>
                    <span className="kb-tl-dot" />
                    <span className="kb-tl-event">{t.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section className="reveal">
            <h3>项目简介</h3>
            <p className="kb-lede">{clean(detail.description)}</p>
          </section>

          {/* 冷知识：让人好奇的"你知道吗" */}
          {detail.fun_facts.length > 0 && (
            <div className="kb-facts">
              <div className="kb-facts-title">你知道吗</div>
              <ul>
                {detail.fun_facts.map((f, i) => (
                  <li key={i} style={{ animationDelay: `${0.15 + i * 0.14}s` }}>
                    <span className="kb-facts-dot">{i + 1}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="reveal">
            <h3>文化内涵</h3>
            <p>{detail.cultural_meaning}</p>
          </section>
          {detail.craft_process && (
            <section className="reveal">
              <h3>技艺工序</h3>
              <p>{detail.craft_process}</p>
            </section>
          )}
          {(detail.representative_works.length > 0 || detail.representative_inheritors.length > 0) && (
            <div className="kb-grid">
              {detail.representative_works.length > 0 && (
                <section className="reveal">
                  <h3>代表作品</h3>
                  <ul>
                    {detail.representative_works.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </section>
              )}
              {detail.representative_inheritors.length > 0 && (
                <section className="reveal">
                  <h3>代表性传承人</h3>
                  <ul>
                    {detail.representative_inheritors.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
          {detail.sources.length > 0 && (
            <section className="reveal">
              <h3>资料来源</h3>
              <ul className="kb-sources">
                {detail.sources.map((s) => (
                  <li key={s.id}>
                    {s.title}（{s.publisher}）· 可信度：{s.reliability_level}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {detail.sources.length === 0 && detail.tier === 'index' && (
            <section className="reveal">
              <h3>条目来源</h3>
              <p className="kb-src-note">
                文化和旅游部 · 中国非物质文化遗产网国家级名录条目，简介据名录整理，证据链见档案。
              </p>
            </section>
          )}

          {/* 相关推荐：把一次阅读延展成一次探索 */}
          {related.length > 0 && (
            <section className="reveal kb-related">
              <h3>顺着这条线索</h3>
              <div className="kb-related-row">
                {related.map((h) => (
                  <button key={h.id} className="kb-related-card" onClick={() => open(h.id)}>
                    <Cover item={h} className="kb-related-img" />
                    <strong>{h.name}</strong>
                    <span>
                      {h.category.split(' · ')[0]} · {h.region.split('（')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        <Motif kind="mountain" />
      </div>
    )
  }

  return (
    <div className="kb-page" ref={pageRef}>
      <header className="kb-header">
        <h1>非遗知识库</h1>
        <p className="kb-count">
          共 {list.length} 项国家级非遗代表性项目 · 其中{' '}
          {list.filter((h) => h.tier !== 'index').length} 份深读档案
        </p>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索名称 / 类别 / 地域…"
          aria-label="搜索非遗项目"
        />
        {/* 类别筛选：全部 + 各大类 */}
        {list.length > 0 && (
          <div className="kb-chips">
            {cats.map((c) => (
              <button
                key={c}
                className={cat === c ? 'on' : ''}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>
      {error && (
        <div className="kb-error" role="alert">
          <p>{error}</p>
          <button className="kb-retry" onClick={loadList}>
            重试
          </button>
        </div>
      )}
      <div className="kb-cards">
        {/* 数据未到时用骨架卡占位，形状与真实卡片一致，避免首屏空白 */}
        {list.length === 0 &&
          !error &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="kb-card kb-card-skeleton" aria-hidden>
              <div className="skeleton kb-skeleton-cover" />
              <div className="kb-card-body">
                <div className="skeleton kb-skeleton-line" style={{ width: '72%' }} />
                <div className="skeleton kb-skeleton-line" style={{ width: '46%' }} />
                <div className="skeleton kb-skeleton-line" style={{ width: '62%' }} />
              </div>
            </div>
          ))}
        {filtered.slice(0, shown).map((h) => (
          <div
            key={h.id}
            className="kb-card"
            role="button"
            tabIndex={0}
            onClick={() => open(h.id)}
            onKeyDown={(e) => onActivate(e, () => open(h.id))}
          >
            <Cover item={h} className="kb-card-cover" />
            <div className="kb-card-body">
              <div className="kb-card-name">{h.name}</div>
              {h.hook && <div className="kb-card-hook">{h.hook}</div>}
              <div className="kb-card-cat">
                {h.category.split(' · ')[0]} · {h.region.split('（')[0]}
              </div>
              <div className="kb-card-level">{h.level}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !error && list.length > 0 && (
          <div className="kb-empty">没有匹配的项目</div>
        )}
      </div>
      {filtered.length > shown && (
        <button className="kb-more" onClick={() => setShown((s) => s + 60)}>
          加载更多（剩 {filtered.length - shown} 项）
        </button>
      )}
      <Motif kind="mountain" />
    </div>
  )
}
