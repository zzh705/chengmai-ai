import { useEffect, useMemo, useState } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchProfile, type Profile } from '../api/progress'
import '../styles/home.css'

interface Props {
  onNavigate: (page: string, query?: string) => void
}

// 模块加载时计算一次今日序号，避免渲染期调用不纯函数
const DAY_INDEX = (() => {
  const start = new Date(new Date().getFullYear(), 0, 0)
  return Math.floor((Date.now() - start.getTime()) / 86400000)
})()

export default function Home({ onNavigate }: Props) {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
    fetchProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  // 今日非遗：按日期轮换，每天换一个
  const dayIndex = list.length ? DAY_INDEX % list.length : 0
  const featured = list[dayIndex]
  const recommended = list.slice(0).filter((h) => h !== featured).slice(0, 3)

  // 地域探索：按 region 聚合
  const regions = useMemo(() => {
    const m = new Map<string, number>()
    list.forEach((h) => m.set(h.region, (m.get(h.region) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [list])

  function askAI() {
    const q = question.trim()
    if (!q) return
    onNavigate('chat', q)
  }

  return (
    <div className="home-page">
      {/* Hero：品牌门面 */}
      <section className="home-hero">
        <div className="home-petals" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="home-seal">承脉</div>
        <h1>让千年非遗，被这一代人接住</h1>
        <p className="home-slogan">
          CHENGMAI · 非遗多智能体系统 —— 检索问答 · 知识图谱 · 学习路径 · 活化创作
        </p>

        <div className="home-ask">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAI()}
            placeholder="问问承脉 AI：什么是昆曲百戏之祖？"
          />
          <button onClick={askAI}>问 AI</button>
        </div>
        <div className="home-chips">
          {['苏绣为什么这么贵？', '给留学生讲京剧', '剪纸的寓意'].map((q) => (
            <button key={q} onClick={() => onNavigate('chat', q)}>
              {q}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="home-error">⚠️ {error}</div>}

      {/* 今日非遗 */}
      {featured && (
        <section className="home-section">
          <h2>🌸 今日非遗</h2>
          <div
            className="home-today"
            onClick={() => onNavigate('knowledge', featured.id)}
            title="进入知识库查看详情"
          >
            <div className="home-today-main">
              <h3>{featured.name}</h3>
              <p>
                {featured.category} · {featured.region} · {featured.level}
              </p>
            </div>
            <span className="home-today-cta">查看详情 →</span>
          </div>
        </section>
      )}

      {/* AI 推荐 + 地域探索 双栏 */}
      <section className="home-cols">
        <div className="home-section">
          <h2>✨ AI 推荐</h2>
          <div className="home-recs">
            {recommended.map((h) => (
              <div key={h.id} className="home-rec" onClick={() => onNavigate('knowledge', h.id)}>
                <strong>{h.name}</strong>
                <span>{h.region}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="home-section">
          <h2>🗺️ 地域探索</h2>
          <div className="home-regions">
            {regions.map(([r, n]) => (
              <button key={r} onClick={() => onNavigate('knowledge', `kw:${r.split('（')[0]}`)}>
                {r} <em>{n}</em>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 学习进度 */}
      <section className="home-section">
        <h2>📈 我的学习进度</h2>
        <div className="home-progress">
          <div className="home-prog-item">
            <strong>{profile?.stats.viewed_items ?? 0}</strong>
            <span>浏览非遗</span>
          </div>
          <div className="home-prog-item">
            <strong>{profile?.stats.learning_plans ?? 0}</strong>
            <span>学习计划</span>
          </div>
          <div className="home-prog-item">
            <strong>
              {profile && profile.quiz.answered > 0
                ? `${Math.round(profile.quiz.accuracy * 100)}%`
                : '—'}
            </strong>
            <span>测验正确率</span>
          </div>
          <div className="home-prog-item">
            <strong>{profile?.stats.creations ?? 0}</strong>
            <span>活化创作</span>
          </div>
          <button className="home-prog-cta" onClick={() => onNavigate('profile')}>
            查看完整档案 →
          </button>
        </div>
      </section>

      <footer className="home-footer">
        承脉 AI · 非遗多智能体系统 —— 面向文化理解与传播的 AI Agent 设计
      </footer>
    </div>
  )
}
