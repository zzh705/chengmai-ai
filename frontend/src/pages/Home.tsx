import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchProfile, type Profile } from '../api/progress'
import { PROVINCES } from '../utils/geo'
import Cover from '../components/Cover'
import CountUp from '../components/CountUp'
import EmberCanvas from '../components/EmberCanvas'
import { useRevealGroup } from '../hooks/useReveal'
import { useTheme } from '../utils/theme'
import { MASTERS } from '../data/masters'
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

// 非遗全景环形图矿彩阶（对应 index.css --viz-*：朱红/藤黄/青碧/黛蓝/绛紫/赭石/松绿，
// 仅用于分类数据可视化，与 UI 控件色板隔离；亮纸主题下金色段加深）
const VIZ_COLORS_INK = ['#b03a2e', '#e8c56b', '#4f8f7b', '#56688f', '#965880', '#b0743c', '#65855a']
const VIZ_COLORS_LIGHT = ['#b03a2e', '#b0882f', '#36705e', '#56688f', '#965880', '#a86e38', '#5b7a50']

// 首页固定展示位：今日非遗 = 昆曲（百戏之祖）；一分钟认识 = 长洲太平清醮 / 粤剧 / 湘绣
const FIXED_FEATURED_ID = 'h_kunqu'
const FIXED_STORY_IDS = ['h_n15160', 'h_yueju_gd', 'h_xiangxiu']

// 名家手卷预览：取前六位开宗立派的大师，其余进名家录
const MASTERS_PREVIEW = MASTERS.slice(0, 6)

// 影像非遗：四支 Commons 授权影像（已落本地 public/videos/，同名缺失时自动回落征集海报）
const HERITAGE_REELS = [
  { id: 'h_kunqu', file: 'kunqu', note: '百戏之祖，水磨腔调婉转六百年', duration: '03:41', credit: 'CC BY 3.0' },
  { id: 'h_jianzhi', file: 'jianzhi', note: '一剪之巧，红纸生花夺天工', duration: '04:01', credit: 'CC BY 3.0' },
  { id: 'h_piying', file: 'piying', note: '一口叙千古事，双手对舞百万兵', duration: '00:19', credit: 'CC BY-SA 4.0' },
  { id: 'h_n14304', file: 'zharan', note: '大理风物，蓝白之间染出人间烟火', duration: '01:07', credit: 'CC BY 4.0' },
] as const

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

/**
 * 影像卡：HEAD 探测 /videos/{file}.webm 是否就位。
 * 就位 → 原生播放器（海报为项目配图）；未就位 → 影像征集海报，点击进入该名录详情。
 */
function ReelCard({
  src,
  posterItem,
  badge,
  duration,
  title,
  meta,
  note,
  credit,
  onOpen,
}: {
  src: string
  posterItem?: HeritageSummary
  badge: string
  duration?: string
  title: string
  meta?: string
  note: string
  credit?: string
  onOpen?: () => void
}) {
  // null=探测中；true=影像可播；false=尚未收录
  const [avail, setAvail] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    // 仅当响应确为视频媒体时才算就位：开发/部署环境的 SPA 回退会把不存在的路径
    // 返回成 index.html（200 text/html），单看状态码会把海报误判成坏视频
    fetch(src, { method: 'HEAD' })
      .then((r) =>
        alive && setAvail(r.ok && (r.headers.get('content-type') ?? '').startsWith('video/')),
      )
      .catch(() => alive && setAvail(false))
    return () => {
      alive = false
    }
  }, [src])

  const pending = avail === false
  return (
    <article className={`home-reel ${pending ? 'is-pending' : ''}`}>
      <div
        className="home-reel-media"
        role={pending && onOpen ? 'button' : undefined}
        tabIndex={pending && onOpen ? 0 : undefined}
        aria-label={pending ? `影像征集中，进入「${title}」详情` : undefined}
        onClick={pending ? onOpen : undefined}
        onKeyDown={pending && onOpen ? (e) => onActivate(e, onOpen) : undefined}
      >
        {avail === true ? (
          <video src={src} controls preload="metadata" playsInline poster={posterItem?.image} />
        ) : (
          <>
            {posterItem && <Cover item={posterItem} className="home-reel-poster" />}
            <div className={`home-reel-veil ${avail === null ? 'is-loading' : ''}`}>
              <span className="home-reel-play" aria-hidden>
                {avail === null ? (
                  <i className="home-reel-spinner" />
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
              {pending && (
                <>
                  <em className="home-reel-status">影像征集中</em>
                  {onOpen && <b className="home-reel-goto">先看它的故事</b>}
                </>
              )}
            </div>
          </>
        )}
        <span className="home-reel-badge">{badge}</span>
        {duration && avail === true && <span className="home-reel-dur">{duration}</span>}
      </div>
      <div className="home-reel-txt">
        <strong>{title}</strong>
        <p>
          {note}
          {meta && <span>{meta}</span>}
          {credit && <span>{credit}</span>}
        </p>
      </div>
    </article>
  )
}

export default function Home({ onNavigate, entered = true }: Props) {
  const [list, setList] = useState<HeritageSummary[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [hoverSeg, setHoverSeg] = useState<string | null>(null)
  const rootRef = useRevealGroup<HTMLDivElement>([list.length])
  const theme = useTheme()
  const VIZ_COLORS = theme === 'light' ? VIZ_COLORS_LIGHT : VIZ_COLORS_INK

  useEffect(() => {
    loadList()
    fetchProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  function loadList() {
    setError('')
    fetchHeritageList().then(setList).catch((e) => setError(`名录暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`))
  }

  // 首页所有展示位只取有真实配图的项目（无图条目已在知识库沉底）
  const pictured = useMemo(() => list.filter((h) => h.has_image !== false), [list])

  // 今日非遗：固定为昆曲（百戏之祖，最能代表非遗的中正典雅）
  const featured = useMemo(
    () => pictured.find((h) => h.id === FIXED_FEATURED_ID) ?? pictured[DAY_INDEX % Math.max(1, pictured.length)],
    [pictured],
  )

  const recommended = useMemo(
    () => pictured.filter((h) => h !== featured).slice(0, 3),
    [pictured, featured],
  )

  // 一分钟认识：固定为长洲太平清醮/粤剧/湘绣（按顺序，保留 hook 渲染）
  const storyPicks = useMemo(() => {
    const picks = FIXED_STORY_IDS
      .map((id) => pictured.find((h) => h.id === id))
      .filter((h): h is HeritageSummary => Boolean(h))
    if (picks.length === FIXED_STORY_IDS.length) return picks
    // 数据尚未就绪或缺失时的兜底：从池里补齐至 3 张
    const pool = pictured.filter(
      (h) => h.hook && h !== featured && !picks.some((p) => p.id === h.id),
    )
    for (let i = 0; picks.length < 3 && i < pool.length; i++) picks.push(pool[i])
    return picks
  }, [pictured, featured])

  // 影像非遗：把留位名录与列表数据对上（拿真实名称、地域与配图）
  const reelPicks = useMemo(
    () =>
      HERITAGE_REELS.map((r) => ({
        ...r,
        item: pictured.find((h) => h.id === r.id),
      })).filter((r) => Boolean(r.item)),
    [pictured],
  )

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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) askAI()
            }}
            aria-label="向承脉 AI 提问"
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

      {error && (
        <div className="home-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadList}>
            重试
          </button>
        </div>
      )}

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
            <span className="home-today-cta">查看</span>
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
                    <em>查看</em>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 今日非遗 · 影像：三项名录影像（同页内嵌，不另开页面） */}
      <section className="home-section home-reels reveal">
        <div className="home-sec-head">
          <h2>今日非遗 · 影像</h2>
          <span className="home-sec-note">一帧光影，一程传承</span>
        </div>
        <div className="home-reels-grid">
          {reelPicks.map((r) => (
            <ReelCard
              key={r.id}
              src={`/videos/${r.file}.webm`}
              posterItem={r.item}
              badge="非遗影像"
              duration={r.duration}
              title={r.item!.name}
              note={r.note}
              meta={`${r.item!.region} · ${r.item!.category.split(' · ')[0]}`}
              credit={`视频 · Wikimedia Commons · ${r.credit}`}
              onOpen={() => onNavigate('knowledge', r.id)}
            />
          ))}
        </div>
      </section>

      {/* 名家风采：开宗立派的大师手卷，横向浏览 */}
      <section className="home-section home-masters reveal">
        <div className="home-sec-head">
          <h2>名家风采</h2>
          <button className="home-roam" onClick={() => onNavigate('masters')}>
            全部名家
          </button>
        </div>
        <div className="home-masters-viewport">
          <div className="home-masters-track">
            {MASTERS_PREVIEW.map((m) => (
              <button
                key={m.id}
                className="home-master"
                onClick={() => onNavigate('masters', m.id)}
                title={`${m.name} · ${m.title}`}
              >
                <span className="home-master-img">
                  <img src={m.image} alt={`${m.name}历史影像`} loading="lazy" />
                  <i className="home-master-seal" aria-hidden>
                    {m.name[m.name.length - 1]}
                  </i>
                </span>
                <span className="home-master-name">{m.name}</span>
                <span className="home-master-art">{m.art}</span>
                <span className="home-master-cta">查看详情</span>
              </button>
            ))}
            <button className="home-master home-master-more" onClick={() => onNavigate('masters')}>
              <span className="home-master-more-inner">
                <em>名家录</em>
                <strong>查看全部 {MASTERS.length} 位 →</strong>
              </span>
            </button>
          </div>
        </div>
      </section>

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
                      >
                        <title>{`${s.name}：${s.count} 项`}</title>
                      </circle>
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
                    role="button"
                    tabIndex={0}
                    aria-label={`${s.name}，${s.count} 项，查看该类项目`}
                    className={hoverSeg === s.name ? 'active' : ''}
                    onMouseEnter={() => setHoverSeg(s.name)}
                    onMouseLeave={() => setHoverSeg(null)}
                    onClick={() => onNavigate('knowledge', `kw:${s.name}`)}
                    onKeyDown={(e) => onActivate(e, () => onNavigate('knowledge', `kw:${s.name}`))}
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
            查看
          </button>
        </div>
      </section>

      <footer className="home-footer">
        承脉 AI · 非遗多智能体系统，面向文化理解与传播的 AI Agent 设计
      </footer>
    </div>
  )
}
