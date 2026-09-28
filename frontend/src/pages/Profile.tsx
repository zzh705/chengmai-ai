import { useEffect, useState } from 'react'
import { fetchProfile, type Profile } from '../api/progress'
import CountUp from '../components/CountUp'
import { calcRank, TITLES } from '../utils/rank'
import '../styles/profile.css'

const EVENT_LABEL: Record<string, string> = {
  view: '浏览',
  learning_plan: '制定学习计划',
  quiz_answer: '答题',
  creation: '活化创作',
}

/** 兴趣雷达：n 轴 SVG 多边形（n<3 时补齐空轴），挂载后由中心展开 */
function Radar({ data }: { data: { category: string; count: number }[] }) {
  const n = Math.max(3, data.length)
  const axes = Array.from({ length: n }, (_, i) => data[i] ?? { category: '', count: 0 })
  const cx = 120
  const cy = 120
  const R = 82
  const max = Math.max(1, ...axes.map((a) => a.count))
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const ring = (r: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = angle(i)
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }).join(' ')
  const shape = axes
    .map((a, i) => {
      const rr = (a.count / max) * R
      const ang = angle(i)
      return `${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 240 240" className="pf-radar" role="img" aria-label="兴趣分布雷达图">
      {[0.34, 0.67, 1].map((k) => (
        <polygon key={k} className="pf-radar-ring" points={ring(R * k)} />
      ))}
      {axes.map((_, i) => (
        <line
          key={i}
          className="pf-radar-axis"
          x1={cx}
          y1={cy}
          x2={cx + R * Math.cos(angle(i))}
          y2={cy + R * Math.sin(angle(i))}
        />
      ))}
      <polygon className="pf-radar-shape" points={shape} />
      {axes.map((a, i) => {
        const ang = angle(i)
        const lx = cx + (R + 16) * Math.cos(ang)
        const ly = cy + (R + 16) * Math.sin(ang)
        return (
          <text
            key={i}
            className="pf-radar-label"
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {a.category.split(' · ')[0]}
            {a.count > 0 ? ` ${a.count}` : ''}
          </text>
        )
      })}
    </svg>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  /** 名片经验条下一帧写入，产生生长动画 */
  const [rankShown, setRankShown] = useState(0)

  useEffect(() => {
    fetchProfile().then(setProfile).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!profile) return
    const target = calcRank(profile).pct
    const t = requestAnimationFrame(() => setRankShown(target))
    return () => cancelAnimationFrame(t)
  }, [profile])

  if (error) return <div className="pf-page pf-center">{error}</div>
  if (!profile) return <div className="pf-page pf-center">档案加载中…</div>

  const s = profile.stats
  const rank = calcRank(profile)
  const empty = profile.recent_events.length === 0

  return (
    <div className="pf-page">
      <header className="pf-header">
        <h1>我的传承档案</h1>
        <p>记录你的非遗学习与创作足迹 · 用户 ID：{profile.user_id}</p>
      </header>

      {/* 传承人名片：称号 + 经验 + 装饰印章 */}
      <div className="pf-hero-card">
        <div className="pf-hero-seal" aria-hidden>
          承脉
        </div>
        <div className="pf-hero-main">
          <span className="pf-hero-lv">Lv.{rank.level}</span>
          <h2>{rank.title}</h2>
          <p>
            {rank.level >= TITLES.length
              ? '已至满级，承脉有你'
              : `再积累 ${150 - (rank.exp % 150)} EXP 升级「${TITLES[rank.level]}」`}
          </p>
        </div>
        <div className="pf-hero-exp">
          <div className="pf-hero-exp-head">
            <span>{rank.exp} EXP</span>
            <span>{rank.pct}%</span>
          </div>
          <div className="pf-hero-exp-bar">
            <i style={{ '--x': rankShown / 100 } as React.CSSProperties} />
          </div>
        </div>
      </div>

      <div className="pf-stats">
        <div className="pf-stat">
          <strong>
            <CountUp value={s.viewed_items} />
          </strong>
          <span>浏览非遗</span>
        </div>
        <div className="pf-stat">
          <strong>
            <CountUp value={s.learning_plans} />
          </strong>
          <span>学习计划</span>
        </div>
        <div className="pf-stat">
          <strong>
            {profile.quiz.answered > 0 ? (
              <CountUp value={Math.round(profile.quiz.accuracy * 100)} />
            ) : (
              '0'
            )}
            %
          </strong>
          <span>测验正确率（{profile.quiz.answered} 题）</span>
        </div>
        <div className="pf-stat">
          <strong>
            <CountUp value={s.creations} />
          </strong>
          <span>活化创作</span>
        </div>
      </div>

      <div className="pf-grid">
        {/* 足迹时间线 */}
        <section className="pf-card pf-timeline-card">
          <h3>足迹时间线</h3>
          {empty ? (
            <p className="pf-empty">还没有足迹，先去问问承脉 AI 吧</p>
          ) : (
            <ul className="pf-timeline">
              {profile.recent_events.map((e, i) => (
                <li key={`${e.ts}-${i}`} style={{ animationDelay: `${i * 0.07}s` }}>
                  <span className="pf-tl-dot" aria-hidden />
                  <span className="pf-tl-label">{EVENT_LABEL[e.type] ?? e.type}</span>
                  <span className="pf-tl-name">{e.name}</span>
                  <span className="pf-tl-ts">{e.ts}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 兴趣雷达 */}
        <section className="pf-card">
          <h3>兴趣雷达</h3>
          {profile.interests.length === 0 ? (
            <p className="pf-empty">还没有足迹，先去问问承脉 AI 吧</p>
          ) : (
            <Radar data={profile.interests} />
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
