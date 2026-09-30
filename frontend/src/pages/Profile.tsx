import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchProfile, type Profile } from '../api/progress'
import CountUp from '../components/CountUp'
import { calcRank, TITLES } from '../utils/rank'
import { getSession, sealChar } from '../utils/auth'
import Motif from '../components/Motif'
import '../styles/profile.css'

const EVENT_LABEL: Record<string, string> = {
  view: '浏览',
  learning_plan: '制定学习计划',
  quiz_answer: '答题',
  creation: '活化创作',
}

/** 每日传承签：十二支签文，皆出梨园匠作之口 */
const SIGNS: { text: string; from: string; note: string }[] = [
  { text: '戏比天大', from: '豫剧 · 常香玉', note: '把手里这件事当作天大的事，戏如此，学亦如此。' },
  { text: '全凭苦学', from: '京剧 · 梅兰芳', note: '大师自称拙笨，一生只凭苦学；慢功夫，最欺人不得。' },
  { text: '台上三分钟，台下十年功', from: '梨园古谚', note: '所有举重若轻，背后都是刻意练习。' },
  { text: '一日不练，自己知道', from: '梨园古谚', note: '两日不练，同行知道；三日不练，观众知道。今日宜温故。' },
  { text: '宁穿破，不穿错', from: '梨园行话', note: '规矩即敬意。先把衣钵穿对，再谈推陈出新。' },
  { text: '艺高人胆大', from: '梨园古谚', note: '底气从手上功夫来，今日宜练基本功。' },
  { text: '拳不离手，曲不离口', from: '俗谚', note: '日日不断，方成本能。哪怕只读一项非遗小传。' },
  { text: '慢工出细活', from: '匠作古谚', note: '非遗以年月计时，急不得。今日宜慢读一项，读深一层。' },
  { text: '三分人工，七分天成', from: '玉雕行话', note: '好手艺懂得顺势而为，材料自有性情，创意也是。' },
  { text: '师傅领进门，修行在个人', from: '俗谚', note: '承脉 AI 领路，路要自己走。今日宜发问三次。' },
  { text: '千学不如一看，千看不如一练', from: '匠作古谚', note: '读十篇不如去活化实验室做一案。' },
  { text: '要使人成癖，必须先有真功夫', from: '京剧 · 程砚秋', note: '令人着迷的从来不是噱头，是功夫本身。' },
]

/** 集印册：八枚印章徽章，由档案数据解锁 */
interface Badge {
  id: string
  seal: string
  name: string
  cond: string
  ok: boolean
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

/** 近 28 天足迹热力：按周分组的日历格（本周超出今天的格子留空） */
function Heat({ activity }: { activity: { date: string; count: number }[] }) {
  const { weeks, total } = useMemo(() => {
    const map = new Map(activity.map((a) => [a.date, a.count]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - 27)
    const gridStart = new Date(start)
    gridStart.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const end = new Date(today)
    end.setDate(today.getDate() + (6 - ((today.getDay() + 6) % 7)))
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const cells: { ds: string; n: number; future: boolean }[] = []
    const cur = new Date(gridStart)
    while (cur <= end) {
      cells.push({ ds: fmt(cur), n: map.get(fmt(cur)) ?? 0, future: cur > today })
      cur.setDate(cur.getDate() + 1)
    }
    const weeks: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    const total = activity.reduce((s, a) => s + a.count, 0)
    return { cells, weeks, total }
  }, [activity])
  const lvl = (n: number) => (n === 0 ? '' : n === 1 ? 'l1' : n <= 3 ? 'l2' : 'l3')

  return (
    <div className="pf-heat-wrap">
      <div className="pf-heat-head">
        <span>近 28 天足迹</span>
        <em>{total} 次互动</em>
      </div>
      <div className="pf-heat">
        <div className="pf-heat-weekdays" aria-hidden>
          {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="pf-heat-week" style={{ animationDelay: `${wi * 0.05}s` }}>
            {week.map((c) => (
              <i
                key={c.ds}
                className={`pf-heat-cell ${c.future ? 'fut' : lvl(c.n)}`}
                role="img"
                aria-label={`${c.ds}${c.future ? '' : ` · ${c.n} 次互动`}`}
                title={`${c.ds}${c.future ? '' : ` · ${c.n} 次`}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="pf-heat-legend">
        <span>少</span>
        <i className="" aria-hidden />
        <i className="l1" aria-hidden />
        <i className="l2" aria-hidden />
        <i className="l3" aria-hidden />
        <span>多</span>
      </div>
    </div>
  )
}

export default function ProfilePage({ onLogout }: { onLogout?: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  /** 名片经验条下一帧写入，产生生长动画 */
  const [rankShown, setRankShown] = useState(0)
  /** 题名入馆的名号（演示版会话，可能为游客或尚未题名） */
  const session = getSession()
  /** 每日传承签：以日为种，一天一支，存入 localStorage */
  const [sign, setSign] = useState<(typeof SIGNS)[number] | null>(() => {
    try {
      const raw = localStorage.getItem('chengmai-daily-sign')
      if (raw) {
        const saved = JSON.parse(raw) as { date: string; idx: number }
        if (saved.date === new Date().toDateString()) return SIGNS[saved.idx % SIGNS.length]
      }
    } catch {
      /* 本地记录损坏则重新求签 */
    }
    return null
  })
  const [drawing, setDrawing] = useState(false)
  /** 印章徽章：点击已解锁者重新盖印（key 递增重挂载触发动画） */
  const [stampKeys, setStampKeys] = useState<Record<string, number>>({})

  /** 求签：摇签 0.9s 后揭晓；同一天重求仍是同一支（以日为种） */
  function drawSign() {
    if (drawing || sign) return
    setDrawing(true)
    const today = new Date().toDateString()
    let h = 0
    for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0
    const idx = h % SIGNS.length
    window.setTimeout(() => {
      setSign(SIGNS[idx])
      try {
        localStorage.setItem('chengmai-daily-sign', JSON.stringify({ date: today, idx }))
      } catch {
        /* 隐私模式下静默 */
      }
      setDrawing(false)
    }, 900)
  }
  const sinceText = useMemo(() => {
    if (!session) return ''
    const d = new Date(session.since)
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日入馆`
  }, [session])

  /** 拉取传承档案；失败给友好提示并可重试，不把原始报错抛给用户 */
  const loadProfile = useCallback(() => {
    fetchProfile()
      .then((p) => {
        setProfile(p)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  /** 重试：先在事件里复位状态，再重新拉取 */
  function retry() {
    setError(false)
    setLoading(true)
    loadProfile()
  }

  useEffect(() => {
    if (!profile) return
    const target = calcRank(profile).pct
    const t = requestAnimationFrame(() => setRankShown(target))
    return () => cancelAnimationFrame(t)
  }, [profile])

  if (error)
    return (
      <div className="pf-page pf-center">
        <div className="pf-state" role="alert">
          <p>档案暂时取不回来，请稍后再试。</p>
          <button className="pf-retry" type="button" onClick={retry}>
            重新加载
          </button>
        </div>
        <Motif kind="lattice" />
      </div>
    )
  if (loading || !profile)
    return (
      <div className="pf-page pf-center" aria-busy="true">
        档案加载中…
        <Motif kind="lattice" />
      </div>
    )

  const s = profile.stats
  const rank = calcRank(profile)
  const empty = profile.recent_events.length === 0

  /** 集印册：八枚徽章的解锁口径（全部前端本地计算，不扰后端） */
  const activeDays = profile.activity.filter((a) => a.count > 0).length
  const badges: Badge[] = [
    { id: 'open', seal: '开卷', name: '开卷有益', cond: '首次浏览非遗', ok: s.viewed_items >= 1 },
    { id: 'wide', seal: '博观', name: '博观约取', cond: '累计浏览 20 项', ok: s.viewed_items >= 20 },
    { id: 'ask', seal: '初问', name: '初问承脉', cond: '制定第一份学习计划', ok: s.learning_plans >= 1 },
    { id: 'three', seal: '连中', name: '连中三元', cond: '累计答对 3 题', ok: profile.quiz.correct >= 3 },
    { id: 'many', seal: '百问', name: '百问不殆', cond: '累计答题 30 题', ok: profile.quiz.answered >= 30 },
    { id: 'craft', seal: '巧匠', name: '活化巧匠', cond: '完成一次活化创作', ok: s.creations >= 1 },
    { id: 'week', seal: '不辍', name: '七日不辍', cond: '活跃满 7 天', ok: activeDays >= 7 },
    { id: 'star', seal: '星河', name: '胸有星河', cond: '经验满 600 EXP', ok: rank.exp >= 600 },
  ]
  const unlockedCount = badges.filter((b) => b.ok).length

  return (
    <div className="pf-page">
      <header className="pf-header">
        <h1>个人中心</h1>
        <p>名号与学习档案同在 · 档案 ID：{profile.user_id}</p>
      </header>

      {/* 传承人名片：名号印章 + 称号 + 经验；入馆方式与退出并入名片，不再单设账号卡 */}
      <div className="pf-block pf-hero-block">
        <div className="pf-hero-card">
          <div className="pf-hero-seal" aria-hidden>
            {session ? sealChar(session.name) : '客'}
          </div>
          <div className="pf-hero-main">
            <span className="pf-hero-name">
              {session?.name ?? '游客'}
              <em>{sinceText}</em>
              <i className="pf-hero-kind">{session?.token ? '实名入馆' : '游客入馆'}</i>
            </span>
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
          {onLogout && (
            <button className="pf-logout" onClick={onLogout}>
              退出登录
            </button>
          )}
        </div>
      </div>

      {/* 称号之路：十级称号一览，当前级高亮 */}
      <div className="pf-block">
        <section className="pf-card">
          <div className="pf-card-head">
            <h3>称号之路</h3>
            <span>
              当前 · {rank.title}（Lv.{rank.level}）
            </span>
          </div>
          <div className="pf-ladder">
            {TITLES.map((t, i) => (
              <span
                key={t}
                className={`pf-ladder-step ${i < rank.level - 1 ? 'done' : i === rank.level - 1 ? 'now' : ''}`}
              >
                <i>{i + 1}</i>
                <em>{t}</em>
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* 集印册：八枚印章徽章，达成条件即盖印；点击已解锁者可重温盖印一刻 */}
      <div className="pf-block">
        <section className="pf-card">
          <div className="pf-card-head">
            <h3>集印册</h3>
            <span>
              已盖 {unlockedCount} / {badges.length} 印
            </span>
          </div>
          <div className="pf-badges">
            {badges.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={`pf-badge ${b.ok ? 'ok' : ''}`}
                title={b.ok ? `${b.name} · 已解锁，点击再盖一次` : `${b.name} · ${b.cond}`}
                aria-label={`${b.name}，${b.ok ? '已解锁' : `未解锁，条件：${b.cond}`}`}
                onClick={() =>
                  b.ok && setStampKeys((k) => ({ ...k, [b.id]: (k[b.id] ?? 0) + 1 }))
                }
              >
                <span
                  key={stampKeys[b.id] ?? 0}
                  className="pf-badge-seal"
                  style={{ animationDelay: b.ok ? `${0.15 + i * 0.09}s` : undefined }}
                >
                  {b.seal}
                </span>
                <span className="pf-badge-name">{b.name}</span>
                <span className="pf-badge-cond">{b.ok ? '已盖印' : b.cond}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 每日传承签：一天一支，梨园匠作的老话 */}
      <div className="pf-block">
        <section className="pf-card pf-sign-card">
          <div className="pf-card-head">
            <h3>每日传承签</h3>
            <span>一天一支 · 今日再求仍是此签</span>
          </div>
          {sign ? (
            <div className="pf-sign-result">
              <span className="pf-sign-slip">
                <i aria-hidden />
                {sign.text}
              </span>
              <div className="pf-sign-side">
                <span className="pf-sign-from">{sign.from}</span>
                <p className="pf-sign-note">{sign.note}</p>
              </div>
            </div>
          ) : (
            <div className="pf-sign-pending">
              <span className={`pf-sign-pot ${drawing ? 'is-shaking' : ''}`} aria-hidden>
                签
              </span>
              <p>晨起问安，向签筒讨一句老话。</p>
              <button
                type="button"
                className="pf-sign-draw"
                onClick={drawSign}
                disabled={drawing}
              >
                {drawing ? '摇签中…' : '求今日签'}
              </button>
            </div>
          )}
        </section>
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
              <>
                <CountUp value={Math.round(profile.quiz.accuracy * 100)} />
                %
              </>
            ) : (
              '-'
            )}
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

      {/* 近 28 天足迹热力日历 */}
      <div className="pf-block">
        <section className="pf-card">
          <Heat activity={profile.activity} />
        </section>
      </div>

      <div className="pf-grid">
        {/* 足迹时间线 */}
        <section className="pf-card pf-timeline-card">
          <h3>足迹时间线</h3>
          {empty ? (
            <p className="pf-empty">还没有足迹，先去浏览非遗吧</p>
          ) : (
            <ul className="pf-timeline">
              {profile.recent_events.map((e, i) => (
                <li
                  key={`${e.ts}-${i}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 0.07}s` }}
                >
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
            <p className="pf-empty">答完几题就能看到你的雷达图</p>
          ) : (
            <Radar data={profile.interests} />
          )}
        </section>

        <section className="pf-card">
          <h3>答题分析</h3>
          {profile.quiz_by_topic.length === 0 ? (
            <p className="pf-empty">还没有答题记录，去挑战页来一题吧</p>
          ) : (
            <>
              <p className="pf-quiz-sum">
                累计 {profile.quiz.answered} 题 · 答对 {profile.quiz.correct} 题 · 正确率{' '}
                {Math.round(profile.quiz.accuracy * 100)}%
              </p>
              {profile.quiz_by_topic.map((t) => (
                <div key={t.topic} className="pf-topic">
                  <span className="pf-topic-name">{t.topic}</span>
                  <span className="pf-topic-bar">
                    <i style={{ '--x': t.accuracy } as React.CSSProperties} />
                  </span>
                  <em>
                    {Math.round(t.accuracy * 100)}% · {t.correct}/{t.answered}
                  </em>
                </div>
              ))}
            </>
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

      {/* 冰梅窗棂双影：档案两壁静立，近指针花影微动，点击梅开五瓣 */}
      <Motif kind="lattice" />
    </div>
  )
}
