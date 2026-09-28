import { useEffect, useRef, useState } from 'react'
import {
  fetchHeritageDetail,
  fetchHeritageList,
  type HeritageDetail,
  type HeritageSummary,
  type WowNumber,
} from '../api/heritage'
import { recordProgress } from '../api/progress'
import Cover from '../components/Cover'
import { useRevealGroup } from '../hooks/useReveal'
import '../styles/knowledge.css'

interface Credit {
  license?: string
}

/** 数字亮点：挂载后 0 → value 缓动滚动（easeOutCubic） */
function WowNum({ value, suffix, label }: WowNumber) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <div className="kb-wow-item">
      <em>
        {n}
        <i>{suffix}</i>
      </em>
      <span>{label}</span>
    </div>
  )
}

export default function Knowledge({ openParam }: { openParam?: string }) {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  const [credits, setCredits] = useState<Record<string, Credit>>({})
  // kw:关键词 → 列表预填搜索（由 App 的 key 重挂载保证初始值即最终值）
  const [keyword, setKeyword] = useState(() =>
    openParam?.startsWith('kw:') ? openParam.slice(3) : '',
  )
  const [error, setError] = useState('')
  const pageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRevealGroup<HTMLDivElement>([detail?.id])

  useEffect(() => {
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
    fetch('/images/heritage/credits.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCredits)
      .catch(() => setCredits({}))
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
    try {
      const d = await fetchHeritageDetail(id)
      setDetail(d)
      recordProgress('view', { id: d.id, name: d.name })
      if (pageRef.current) pageRef.current.scrollTop = 0
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }

  const filtered = list.filter(
    (h) =>
      h.name.includes(keyword) ||
      h.category.includes(keyword) ||
      h.region.includes(keyword),
  )

  if (detail) {
    const credit = credits[detail.id]
    return (
      <div className="kb-page" ref={pageRef}>
        <div className="kb-detail" ref={detailRef}>
          <button className="kb-back" onClick={() => setDetail(null)}>
            ← 返回列表
          </button>
          <Cover item={detail} className="kb-detail-cover" />
          {credit && (
            <div className="kb-cover-credit">
              图片：Wikimedia Commons · {credit.license || 'CC'}
            </div>
          )}
          <h1>
            {detail.name}
            <span className="kb-level">{detail.level}</span>
          </h1>
          <div className="kb-meta">
            {detail.category} · {detail.region} · {detail.era}
          </div>

          {/* 悬念钩子：详情页第一记视觉重拳 */}
          {detail.hook && <div className="kb-hook">「{detail.hook}」</div>}

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
              <p>{detail.story}</p>
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
            <p>{detail.description}</p>
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
          <section className="reveal">
            <h3>技艺工序</h3>
            <p>{detail.craft_process}</p>
          </section>
          <div className="kb-grid">
            <section className="reveal">
              <h3>代表作品</h3>
              <ul>
                {detail.representative_works.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
            <section className="reveal">
              <h3>代表性传承人</h3>
              <ul>
                {detail.representative_inheritors.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          </div>
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
        </div>
      </div>
    )
  }

  return (
    <div className="kb-page" ref={pageRef}>
      <header className="kb-header">
        <h1>非遗知识库</h1>
        <p className="kb-count">共 {list.length} 项国家级非遗代表性项目</p>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索名称 / 类别 / 地域…"
        />
      </header>
      {error && <div className="kb-error">{error}</div>}
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
        {filtered.map((h) => (
          <div key={h.id} className="kb-card" onClick={() => open(h.id)}>
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
    </div>
  )
}
