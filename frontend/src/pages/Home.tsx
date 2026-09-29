import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchProfile, type Profile } from '../api/progress'
import { PROVINCES } from '../utils/geo'
import Cover from '../components/Cover'
import CountUp from '../components/CountUp'
import EmberCanvas from '../components/EmberCanvas'
import { useRevealGroup } from '../hooks/useReveal'
import '../styles/home.css'

interface Props {
  onNavigate: (page: string, query?: string) => void
  /** 开屏是否已结束：控制首页星火粒子的诞生时机 */
  entered?: boolean
}

// 模块加载时计算一次今日序号，避免渲染期调用不纯函数
const DAY_INDEX = (() => {
  const start = new Date(new Date().getFullYear(), 0, 0)
  return Math.floor((Date.now() - start.getTime()) / 86400000)
})()

// 非遗全景环形图配色（朱红/藤黄/青碧/黛蓝/绛紫/赭石/松绿）
const VIZ_COLORS = ['#b03a2e', '#e8c56b', '#4a7c6f', '#5a6f9c', '#a45c8a', '#c07b3a', '#6b8f5e']

// 探索矩阵：首页功能总入口（序号+文字，不用小图标）
const GATES = [
  { page: 'knowledge', title: '非遗知识库', desc: '故事、工序、谱系一次读透' },
  { page: 'map', title: '非遗地图', desc: '沿华夏地理看非遗分布' },
  { page: 'graph', title: '知识图谱', desc: '项目、人物、地域关系网络' },
  { page: 'path', title: '学习路径', desc: '输入主题即得七日精进路线' },
  { page: 'lab', title: '活化实验室', desc: '文创、活动、短视频方案即刻生成' },
  { page: 'challenge', title: '非遗挑战', desc: '三题快问快答，收集徽章' },
]

/** 卡片键盘激活：Enter/空格触发，与 click 等价 */
const onActivate = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

export default function Home({ onNavigate, entered = true }: Props) {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [hoverSeg, setHoverSeg] = useState<string | null>(null)
  const rootRef = useRevealGroup<HTMLDivElement>([list.length])

  useEffect(() => {
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
    fetchProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  // 今日非遗：按日期轮换，每天换一个
  const dayIndex = list.length ? DAY_INDEX % list.length : 0
  const featured = list[dayIndex]
  const recommended = useMemo(
    () => list.filter((h) => h !== featured).slice(0, 3),
    [list, featured],
  )

  // 一分钟认识：避开今日与推荐位，按天轮换三张故事卡
  const storyPicks = useMemo(() => {
    const pool = list.filter(
      (h) => h.hook && h !== featured && !recommended.some((r) => r.id === h.id),
    )
    if (pool.length === 0) return []
    const picks: HeritageSummary[] = []
    for (let i = 0; picks.length < 3 && i < pool.length * 3; i++) {
      const cand = pool[(DAY_INDEX * 3 + i * 7) % pool.length]
      if (!picks.some((p) => p.id === cand.id)) picks.push(cand)
    }
    return picks
  }, [list, featured, recommended])

  // 地域探索：与地图同口径（含「全国」只记全国）；否则该省出现即计入
  // （多省项目如"陕西、河北唐山…"会同时给相关省份计数，避免首页与地图数字打架）
  const regions = useMemo(() => {
    const m = new Map<string, number>()
    list.forEach((h) => {
      if (h.region.includes('全国')) {
        m.set('全国', (m.get('全国') ?? 0) + 1)
        return
      }
      const hits = PROVINCES.filter((p) => h.region.includes(p))
      if (hits.length === 0) m.set('其他', (m.get('其他') ?? 0) + 1)
      hits.forEach((p) => m.set(p, (m.get(p) ?? 0) + 1))
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
  }, [list])

  // 非遗全景：类别环形分段（按计数降序，前缀和决定每段起始角）
  const catSegs = useMemo(() => {
    const m = new Map<string, number>()
    list.forEach((h) => {
      const c = h.category.split(' · ')[0]
      m.set(c, (m.get(c) ?? 0) + 1)
    })
    const total = Math.max(1, list.length)
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1])
    const fracs = entries.map(([, count]) => count / total)
    // 纯函数前缀和：starts[i] = fracs[0..i-1] 之和（避免可变累加触发 lint）
    const starts = fracs.map((_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0))
    return entries.map(([name, count], i) => ({
      name,
      count,
      frac: fracs[i],
      start: starts[i],
    }))
  }, [list])

  const topProvs = regions.filter(([r]) => r !== '全国' && r !== '其他').slice(0, 5)
  const coveredProvs = regions.filter(([r]) => r !== '全国' && r !== '其他').length
  // 悬停的类别（null = 显示总览）
  const hoveredCat = catSegs.find((s) => s.name === hoverSeg) ?? null

  function askAI() {
    const q = question.trim()
    if (!q) return
    onNavigate('chat', q)
  }

  // 随手漫游：随机进入一件非遗的详情
  function randomRoam() {
    if (list.length === 0) return
    const pick = list[Math.floor(Math.random() * list.length)]
    onNavigate('knowledge', pick.id)
  }

  return (
    <div className="home-page" ref={rootRef}>
      {/* Hero：品牌门面 */}
      <section className="home-hero">
        <EmberCanvas active={entered} />
        <div className="home-petals" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="home-seal">承脉</div>
        <h1>让千年非遗，被这一代人接住</h1>
        <p className="home-slogan">CHENGMAI · 非遗多智能体系统</p>

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

      {/* 功能清单独立成带（移出 hero：hero 文字元素需 ≤4 层，且不得内嵌功能列表） */}
      <div className="home-slogan-feats" aria-label="核心功能">
        <span>检索问答</span>
        <span>知识图谱</span>
        <span>学习路径</span>
        <span>活化创作</span>
      </div>

      {error && <div className="home-error">{error}</div>}

      {/* 探索矩阵：全站功能入口 */}
      <section className="home-section reveal">
        <div className="home-sec-head">
          <h2>开始探索</h2>
          <button className="home-roam" onClick={randomRoam}>
            随手漫游一件非遗
          </button>
        </div>
        <div className="home-gates">
          {GATES.map((g, i) => (
            <button
              key={g.page}
              className="home-gate"
              onClick={() => onNavigate(g.page)}
            >
              <span className="home-gate-no">{String(i + 1).padStart(2, '0')}</span>
              <strong>{g.title}</strong>
              <p>{g.desc}</p>
              <span className="home-gate-go">查看</span>
            </button>
          ))}
        </div>
      </section>

      {/* 数据未到时的骨架占位：形状与真实区块一致，数据到达即无缝替换 */}
      {list.length === 0 && !error && (
        <>
          <section className="home-section reveal">
            <h2>今日非遗</h2>
            <div className="home-today skeleton home-skel-today" aria-hidden />
          </section>
          <section className="home-cols reveal">
            <div className="home-section">
              <h2>AI 推荐</h2>
              <div className="home-recs" aria-hidden>
                <div className="home-rec skeleton home-skel-rec" />
                <div className="home-rec skeleton home-skel-rec" />
                <div className="home-rec skeleton home-skel-rec" />
              </div>
            </div>
            <div className="home-section">
              <h2>地域探索</h2>
              <div className="home-regions skeleton home-skel-regions" aria-hidden />
            </div>
          </section>
        </>
      )}

      {/* 今日非遗 */}
      {featured && (
        <section className="home-section reveal">
          <h2>今日非遗</h2>
          <div
            className="home-today"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('knowledge', featured.id)}
            onKeyDown={(e) => onActivate(e, () => onNavigate('knowledge', featured.id))}
            title="查看知识库详情"
          >
            <Cover item={featured} className="home-today-img" />
            <div className="home-today-main">
              <h3>{featured.name}</h3>
              <p>
                <span>{featured.category}</span>
                <span>
                  {featured.region} · {featured.level}
                </span>
              </p>
            </div>
            <span className="home-today-cta">查看 →</span>
          </div>
        </section>
      )}

      {/* 一分钟认识：故事钩子卡 */}
      {storyPicks.length > 0 && (
        <section className="home-section reveal">
          <div className="home-sec-head">
            <h2>一分钟认识</h2>
            <span className="home-sec-note">从一个悬念，走进一项非遗</span>
          </div>
          <div className="home-stories">
            {storyPicks.map((h) => (
              <article
                key={h.id}
                className="home-story"
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('knowledge', h.id)}
                onKeyDown={(e) => onActivate(e, () => onNavigate('knowledge', h.id))}
              >
                <Cover item={h} className="home-story-img" />
                <div className="home-story-txt">
                  <span className="home-story-cat">{h.category.split(' · ')[0]}</span>
                  <p className="home-story-hook">「{h.hook}」</p>
                  <span className="home-story-foot">
                    {h.name} · {h.region}
                    <em>查看 →</em>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* AI 推荐 + 地域探索 双栏 */}
      <section className="home-cols reveal">
        <div className="home-section">
          <h2>AI 推荐</h2>
          <div className="home-recs">
            {recommended.map((h) => (
              <div
                key={h.id}
                className="home-rec"
                role="button"
                tabIndex={0}
                onClick={() => onNavigate('knowledge', h.id)}
                onKeyDown={(e) => onActivate(e, () => onNavigate('knowledge', h.id))}
              >
                <Cover item={h} className="home-rec-img" />
                <div className="home-rec-txt">
                  <strong>{h.name}</strong>
                  <span>{h.region}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="home-section">
          <h2>地域探索</h2>
          <div className="home-regions">
            {regions.map(([r, n]) => (
              <button key={r} onClick={() => onNavigate('knowledge', `kw:${r}`)}>
                {r} <em>{n}</em>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 非遗全景数据屏：类别环形 + 省份排行 + 关键数字 */}
      {list.length > 0 && topProvs.length > 0 && (
        <section className="home-section home-viz reveal">
          <h2>非遗全景</h2>
          <div className="viz-grid">
            <div className="viz-donut-col">
              <div className="viz-donut-wrap">
                <svg
                  viewBox="0 0 140 140"
                  className="viz-donut"
                  onMouseLeave={() => setHoverSeg(null)}
                >
                  {catSegs.map((s, i) => {
                    const C = 2 * Math.PI * 54
                    return (
                      <circle
                        key={s.name}
                        cx={70}
                        cy={70}
                        r={54}
                        fill="none"
                        stroke={VIZ_COLORS[i % VIZ_COLORS.length]}
                        strokeWidth={hoverSeg && hoverSeg !== s.name ? 13 : 18}
                        strokeDasharray={`${s.frac * C} ${C - s.frac * C}`}
                        strokeDashoffset={-s.start * C}
                        transform="rotate(-90 70 70)"
                        onMouseEnter={() => setHoverSeg(s.name)}
                        onClick={() => onNavigate('knowledge', `kw:${s.name}`)}
                      />
                    )
                  })}
                </svg>
                <div className="viz-donut-center">
                  <strong>{hoveredCat ? hoveredCat.name : `${catSegs.length} 大类`}</strong>
                  <span>
                    {hoveredCat ? `${hoveredCat.count} 项 · 点击查看` : `${list.length} 项收录`}
                  </span>
                </div>
              </div>
              <ul className="viz-legend">
                {catSegs.map((s, i) => (
                  <li
                    key={s.name}
                    className={hoverSeg === s.name ? 'active' : ''}
                    onMouseEnter={() => setHoverSeg(s.name)}
                    onMouseLeave={() => setHoverSeg(null)}
                    onClick={() => onNavigate('knowledge', `kw:${s.name}`)}
                  >
                    <i style={{ background: VIZ_COLORS[i % VIZ_COLORS.length] }} />
                    <span>{s.name}</span>
                    <em>{s.count}</em>
                  </li>
                ))}
              </ul>
            </div>

            <div className="viz-rank">
              <h3>省份 TOP 5</h3>
              <ul>
                {topProvs.map(([r, n]) => (
                  <li
                    key={r}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('knowledge', `kw:${r}`)}
                    onKeyDown={(e) => onActivate(e, () => onNavigate('knowledge', `kw:${r}`))}
                  >
                    <span className="viz-rank-name">{r}</span>
                    <span className="viz-rank-bar">
                      <i style={{ width: `${(n / topProvs[0][1]) * 100}%` }} />
                    </span>
                    <em>{n}</em>
                  </li>
                ))}
              </ul>
            </div>

            <div className="viz-nums">
              {[
                { n: list.length, l: '收录项目' },
                { n: coveredProvs, l: '覆盖省级行政区' },
                { n: catSegs.length, l: '非遗大类' },
                { n: list.filter((h) => h.image).length, l: '自由版权配图' },
              ].map((v) => (
                <div key={v.l}>
                  <em>
                    <CountUp value={v.n} />
                  </em>
                  <span>{v.l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 学习进度 */}
      <section className="home-section reveal">
        <h2>我的学习进度</h2>
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
                : '0%'}
            </strong>
            <span>测验正确率</span>
          </div>
          <div className="home-prog-item">
            <strong>{profile?.stats.creations ?? 0}</strong>
            <span>活化创作</span>
          </div>
          <button className="home-prog-cta" onClick={() => onNavigate('profile')}>
            查看 →
          </button>
        </div>
      </section>

      <footer className="home-footer">
        承脉 AI · 非遗多智能体系统，面向文化理解与传播的 AI Agent 设计
      </footer>
    </div>
  )
}
