import { useEffect, useRef, useState } from 'react'
import {
  fetchHeritageDetail,
  fetchHeritageList,
  type HeritageDetail,
  type HeritageSummary,
} from '../api/heritage'
import Cover from '../components/Cover'
import '../styles/knowledge.css'

interface Credit {
  license?: string
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
      setDetail(await fetchHeritageDetail(id))
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
        <div className="kb-detail">
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

          <section>
            <h3>项目简介</h3>
            <p>{detail.description}</p>
          </section>
          <section>
            <h3>文化内涵</h3>
            <p>{detail.cultural_meaning}</p>
          </section>
          <section>
            <h3>技艺工序</h3>
            <p>{detail.craft_process}</p>
          </section>
          <div className="kb-grid">
            <section>
              <h3>代表作品</h3>
              <ul>
                {detail.representative_works.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>代表性传承人</h3>
              <ul>
                {detail.representative_inheritors.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          </div>
          <section>
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
        {filtered.map((h) => (
          <div key={h.id} className="kb-card" onClick={() => open(h.id)}>
            <Cover item={h} className="kb-card-cover" />
            <div className="kb-card-body">
              <div className="kb-card-name">{h.name}</div>
              <div className="kb-card-cat">{h.category}</div>
              <div className="kb-card-region">{h.region.split('（')[0]}</div>
              <div className="kb-card-level">{h.level}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !error && (
          <div className="kb-empty">没有匹配的项目</div>
        )}
      </div>
    </div>
  )
}
