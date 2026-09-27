import { useEffect, useState } from 'react'
import {
  fetchHeritageDetail,
  fetchHeritageList,
  type HeritageDetail,
  type HeritageSummary,
} from '../api/heritage'
import '../styles/knowledge.css'

export default function Knowledge() {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
  }, [])

  async function open(id: string) {
    try {
      setDetail(await fetchHeritageDetail(id))
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
    return (
      <div className="kb-page">
        <div className="kb-detail">
          <button className="kb-back" onClick={() => setDetail(null)}>
            ← 返回列表
          </button>
          <h1>
            {detail.name}
            <span className="kb-level">{detail.level}</span>
          </h1>
          <div className="kb-meta">
            {detail.category} · {detail.region} · {detail.era}
          </div>

          <section>
            <h3>📖 项目简介</h3>
            <p>{detail.description}</p>
          </section>
          <section>
            <h3>🏮 文化内涵</h3>
            <p>{detail.cultural_meaning}</p>
          </section>
          <section>
            <h3>✂️ 技艺工序</h3>
            <p>{detail.craft_process}</p>
          </section>
          <div className="kb-grid">
            <section>
              <h3>🎨 代表作品</h3>
              <ul>
                {detail.representative_works.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>👤 代表性传承人</h3>
              <ul>
                {detail.representative_inheritors.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          </div>
          <section>
            <h3>📚 资料来源</h3>
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
    <div className="kb-page">
      <header className="kb-header">
        <h1>非遗知识库</h1>
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
            <div className="kb-card-name">{h.name}</div>
            <div className="kb-card-cat">{h.category}</div>
            <div className="kb-card-region">📍 {h.region.split('（')[0]}</div>
            <div className="kb-card-level">{h.level}</div>
          </div>
        ))}
        {filtered.length === 0 && !error && (
          <div className="kb-empty">没有匹配的项目</div>
        )}
      </div>
    </div>
  )
}
