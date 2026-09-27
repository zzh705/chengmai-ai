import { useEffect, useRef, useState } from 'react'
import {
  fetchHeritageDetail,
  fetchHeritageList,
  type HeritageDetail,
  type HeritageSummary,
} from '../api/heritage'
import '../styles/knowledge.css'

interface Credit {
  license?: string
}

/** 图片封面：加载失败时回退为渐变字卡 */
function Cover({ item, className }: { item: HeritageSummary | HeritageDetail; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`${className} kb-cover-fallback`} aria-hidden>
        {item.name.slice(0, 1)}
      </div>
    )
  }
  return (
    <img
      className={className}
      src={item.image}
      alt={item.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default function Knowledge() {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  const [credits, setCredits] = useState<Record<string, Credit>>({})
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
    fetch('/images/heritage/credits.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCredits)
      .catch(() => setCredits({}))
  }, [])

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
