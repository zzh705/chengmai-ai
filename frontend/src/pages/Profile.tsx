import { useEffect, useState } from 'react'
import { fetchProfile, type Profile } from '../api/progress'
import '../styles/profile.css'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile().then(setProfile).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="pf-page pf-center">{error}</div>
  if (!profile) return <div className="pf-page pf-center">档案加载中…</div>

  const s = profile.stats

  return (
    <div className="pf-page">
      <header className="pf-header">
        <h1>我的传承档案</h1>
        <p>记录你的非遗学习与创作足迹 · 用户 ID：{profile.user_id}</p>
      </header>

      <div className="pf-stats">
        <div className="pf-stat">
          <strong>{s.viewed_items}</strong>
          <span>浏览非遗</span>
        </div>
        <div className="pf-stat">
          <strong>{s.learning_plans}</strong>
          <span>学习计划</span>
        </div>
        <div className="pf-stat">
          <strong>{profile.quiz.answered > 0 ? `${Math.round(profile.quiz.accuracy * 100)}%` : '—'}</strong>
          <span>测验正确率（{profile.quiz.answered} 题）</span>
        </div>
        <div className="pf-stat">
          <strong>{s.creations}</strong>
          <span>活化创作</span>
        </div>
      </div>

      <div className="pf-grid">
        <section className="pf-card">
          <h3>兴趣画像</h3>
          {profile.interests.length === 0 ? (
            <p className="pf-empty">还没有足迹，先去问问承脉 AI 吧</p>
          ) : (
            profile.interests.map((i) => (
              <div key={i.category} className="pf-interest">
                <span>{i.category}</span>
                <div className="pf-bar">
                  <div
                    className="pf-bar-inner"
                    style={{
                      width: `${(i.count / profile.interests[0].count) * 100}%`,
                    }}
                  />
                </div>
                <em>{i.count}</em>
              </div>
            ))
          )}
        </section>

        <section className="pf-card">
          <h3>浏览过的非遗</h3>
          {profile.viewed.length === 0 ? (
            <p className="pf-empty">暂无记录</p>
          ) : (
            profile.viewed.map((v) => (
              <div key={v.item_id} className="pf-line">
                {v.name} <span>×{v.count}</span>
              </div>
            ))
          )}
        </section>

        <section className="pf-card">
          <h3>学习计划</h3>
          {profile.learning_plans.length === 0 ? (
            <p className="pf-empty">暂无记录</p>
          ) : (
            profile.learning_plans.map((p, i) => (
              <div key={i} className="pf-line">
                {p.topic} <span>{p.ts}</span>
              </div>
            ))
          )}
        </section>

        <section className="pf-card">
          <h3>活化创作</h3>
          {profile.creations.length === 0 ? (
            <p className="pf-empty">暂无记录</p>
          ) : (
            profile.creations.map((c, i) => (
              <div key={i} className="pf-line">
                {c.topic} <span>{c.ts}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
