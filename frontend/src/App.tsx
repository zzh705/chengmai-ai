/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：核心原创：无 URL 路由库的纯内部状态十页导航骨架、入馆动画衔接与跨页视频/音频生命周期管理
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Splash from './components/Splash'
import CraftVeil from './components/CraftFigures'
import About from './pages/About'
import Chat from './pages/Chat'
import Challenge from './pages/Challenge'
import Guide from './pages/Guide'
import { GUIDE_VEILS, type CraftKey } from './guideStations'
import Home from './pages/Home'
import Knowledge from './pages/Knowledge'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Lab from './pages/Lab'
import Login from './pages/Login'
import MapPage from './pages/Map'
import Masters from './pages/Masters'
import Path from './pages/Path'
import ProfilePage from './pages/Profile'
import ThemeToggle from './components/ThemeToggle'
import { clearSession, getSession } from './utils/auth'

type Page =
  | 'home'
  | 'guide'
  | 'chat'
  | 'knowledge'
  | 'graph'
  | 'map'
  | 'masters'
  | 'path'
  | 'lab'
  | 'challenge'
  | 'profile'
  | 'about'

const NAV: { key: Page; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'chat', label: '承脉 AI' },
  { key: 'knowledge', label: '非遗知识库' },
  { key: 'graph', label: '知识图谱' },
  { key: 'map', label: '非遗地图' },
  { key: 'masters', label: '名家风采' },
  { key: 'path', label: '学习路径' },
  { key: 'lab', label: '活化实验室' },
  { key: 'challenge', label: '非遗挑战' },
  { key: 'profile', label: '个人中心' },
  { key: 'about', label: '关于项目' },
]

const HAS_VIEW_TRANSITION =
  typeof document !== 'undefined' &&
  'startViewTransition' in document &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (HAS_VIEW_TRANSITION) document.documentElement.classList.add('has-vt')

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 新手指引断点站次（越界时回第 1 站），返回按钮与揭幕转场共用 */
function guideStepIndex(): number {
  try {
    const n = parseInt(localStorage.getItem('cm-guide-step') ?? '0', 10)
    return Number.isFinite(n) && n >= 0 && n < GUIDE_VEILS.length ? n : 0
  } catch {
    return 0
  }
}

/**
 * 页面风味：切页入场各有气质（fade 沉静 / rise 展卷 / drift 入舆 / ink 墨晕 / lift 上榜），
 * 金线扫光按页面组换色；方向感知由 --vt-x（正=向右切，负=回切）驱动位移。
 */
const MOOD: Record<string, { in: string; dur: string; a: string; b: string }> = {
  home: { in: 'vtInFade', dur: '0.44s', a: '#e8c56b', b: '#b03a2e' },
  guide: { in: 'vtInInk', dur: '0.6s', a: '#e8c56b', b: '#b03a2e' },
  chat: { in: 'vtInFade', dur: '0.46s', a: '#e8c56b', b: '#b03a2e' },
  knowledge: { in: 'vtInRise', dur: '0.5s', a: '#e8c56b', b: '#4f8f7b' },
  graph: { in: 'vtInRise', dur: '0.5s', a: '#e8c56b', b: '#4f8f7b' },
  map: { in: 'vtInDrift', dur: '0.56s', a: '#e8c56b', b: '#4f8f7b' },
  masters: { in: 'vtInRise', dur: '0.52s', a: '#e8c56b', b: '#b03a2e' },
  path: { in: 'vtInInk', dur: '0.62s', a: '#e8c56b', b: '#b03a2e' },
  lab: { in: 'vtInInk', dur: '0.62s', a: '#e8c56b', b: '#b03a2e' },
  challenge: { in: 'vtInLift', dur: '0.44s', a: '#e8c56b', b: '#b03a2e' },
  profile: { in: 'vtInLift', dur: '0.44s', a: '#e8c56b', b: '#b03a2e' },
  about: { in: 'vtInRise', dur: '0.54s', a: '#e8c56b', b: '#b03a2e' },
}

function applyPageMood(target: string, dir: number) {
  const r = document.documentElement
  const m = MOOD[target]
  r.style.setProperty('--vt-new-in', m?.in ?? 'vtInRise')
  r.style.setProperty('--vt-dur', m?.dur ?? '0.5s')
  // 正=向右前进（新页自右入），负=回切（新页自左入）
  r.style.setProperty('--vt-x', dir < 0 ? '-34px' : '34px')
  r.style.setProperty('--route-a', m?.a ?? '#e8c56b')
  r.style.setProperty('--route-b', m?.b ?? '#b03a2e')
  r.classList.toggle('vt-back', dir < 0)
}

// VT 期间新页是静态快照：入场动画若照常播会在快照里定格、转场结束跳变。
// 故转场窗口内（vt-running）把入场动画/渐显统一推迟到转场结束后再播。
let vtCleanupTimer: ReturnType<typeof setTimeout> | undefined
function setVtRunning(on: boolean) {
  clearTimeout(vtCleanupTimer)
  if (on) document.documentElement.classList.add('vt-running')
  else document.documentElement.classList.remove('vt-running')
}

function App() {
  // 三阶段：未题名 → 登录仪式；题名成功 / 已有会话 → 开屏动画；之后入馆
  const [phase, setPhase] = useState<'login' | 'splash' | 'app'>(() =>
    getSession() ? 'splash' : 'login',
  )
  const [page, setPage] = useState<Page>('home')
  const [chatQuery, setChatQuery] = useState<string | undefined>(undefined)
  const [kbParam, setKbParam] = useState<string | undefined>(undefined)
  const [mapParam, setMapParam] = useState<string | undefined>(undefined)
  const [masterParam, setMasterParam] = useState<string | undefined>(undefined)
  /** 揭幕转场幕布：guide ↔ 功能页之间由专属小人登台表演 + 站色双扇揭幕 */
  const [veil, setVeil] = useState<{ craft: CraftKey; a: string; b: string } | null>(null)
  const veilTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** 从指引「去体验」跳离后，在任意页面亮起悬浮返回钮 */
  const [fromGuide, setFromGuide] = useState(false)
  const splash = phase === 'splash'

  // 窄屏导航横向溢出时，保证当前页按钮居中可见（避免 active 项被裁成一条红边）
  useLayoutEffect(() => {
    if (phase !== 'app') return
    const links = document.querySelector<HTMLDivElement>('.app-nav-links')
    const activeBtn = links?.querySelector<HTMLButtonElement>('button.active')
    if (!links || !activeBtn) return
    const lb = links.getBoundingClientRect()
    const bb = activeBtn.getBoundingClientRect()
    const delta = bb.left - lb.left - (lb.width - bb.width) / 2
    if (Math.abs(delta) > 1) links.scrollLeft += delta
  }, [page, phase])

  /** 退出登录：清会话回到题名仪式页 */
  function logout() {
    clearSession()
    setPage('home')
    setFromGuide(false)
    setPhase('login')
  }

  /** 揭幕转场：所在站的专属小人登台表演，站色双扇向两侧揭开现出新页面 */
  function fireVeil(v: { craft: CraftKey; a: string; b: string }) {
    if (REDUCED_MOTION) return
    setVeil(v)
    clearTimeout(veilTimer.current)
    veilTimer.current = setTimeout(() => setVeil(null), 1550)
  }

  /**
   * 导航并携带参数：chat=问题文本，knowledge=项目 id 或 kw:关键词，map=省份 key；
   * 第二参为对象时视作揭幕视觉（新手指引「去体验」带入当前站专属小人与主色）
   */
  function navigate(target: string, param?: string | { craft: CraftKey; b: string }) {
    const veilArg = param && typeof param === 'object' ? param : undefined
    const paramStr = typeof param === 'string' ? param : undefined
    // 方向感知：按导航序判断前进/回切，决定入场方向与金线扫光起点
    const from = NAV.findIndex((n) => n.key === page)
    const to = NAV.findIndex((n) => n.key === target)
    const dir = from >= 0 && to >= 0 && from !== to ? Math.sign(to - from) : 1
    applyPageMood(target, dir)
    const apply = () => {
      setPage(target as Page)
      if (target === 'chat') {
        // 每次带新问题进对话页都生成新值，触发 Chat 重新挂载并自动发送
        setChatQuery(paramStr)
      }
      if (target === 'knowledge') setKbParam(paramStr)
      if (target === 'map') setMapParam(paramStr)
      if (target === 'masters') setMasterParam(paramStr)
    }
    // 返回钮标记：从指引跳出去亮起；回到指引本身即熄灭
    if (page === 'guide' && target !== 'guide') setFromGuide(true)
    if (target === 'guide' && page !== 'guide') setFromGuide(false)
    // guide ↔ 功能页：不叠 VT，改由小人登台的站色揭幕（幕布盖满整屏，页面在其下完成切换）
    if (page === 'guide' || target === 'guide') {
      const v = veilArg ?? GUIDE_VEILS[guideStepIndex()] ?? GUIDE_VEILS[0]
      fireVeil({ craft: v.craft, a: '#e8c56b', b: v.b })
      apply()
      return
    }
    if (HAS_VIEW_TRANSITION) {
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> }
      }
      setVtRunning(true)
      const t = doc.startViewTransition?.(() => flushSync(apply))
      // 转场结束后留 0.75s 余量（入场动画时长 ≤0.7s），等动画播完再撤销延迟，
      // 避免 animation-delay 回跳导致已播内容闪变
      const onFinished = () => {
        vtCleanupTimer = setTimeout(() => setVtRunning(false), 750)
      }
      t?.finished.then(onFinished).catch(onFinished)
      if (!t) {
        apply()
        setVtRunning(false)
      }
    } else {
      apply()
    }
  }

  /** 开屏动画结束入馆：本会话内首次入馆自动拉起新手指引（刷新不重复打断） */
  function afterSplash() {
    setPhase('app')
    try {
      if (sessionStorage.getItem('cm-guide-auto') !== '1') {
        sessionStorage.setItem('cm-guide-auto', '1')
        // 等开屏层完全卸载再揭幕进指引（用定时器而非 rAF：后台标签页 rAF 会被挂起）
        setTimeout(() => navigate('guide'), 260)
      }
    } catch {
      /* 存储不可用时静默跳过自动拉起 */
    }
  }

  if (phase === 'login') {
    return <Login onEnter={() => setPhase('splash')} />
  }

  return (
    <div className={`app-shell ${splash ? 'pre-splash' : 'entered'}`}>
      {splash && <Splash onDone={afterSplash} />}
      {/* 无障碍：键盘用户首焦点直达主内容，跳过 10 项导航 */}
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <nav className="app-nav" aria-label="主导航">
        <button
          type="button"
          className="app-brand"
          aria-label="返回首页"
          onClick={() => navigate('home')}
        >
          承脉
        </button>
        <div className="app-nav-links">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={page === n.key ? 'active' : ''}
              aria-current={page === n.key ? 'page' : undefined}
              onClick={() => navigate(n.key)}
            >
              {n.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`app-guide-btn ${page === 'guide' ? 'active' : ''}`}
          aria-current={page === 'guide' ? 'page' : undefined}
          onClick={() => navigate('guide')}
          title="新手指引 · 十一站逛馆"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M3.2 3.2h9.6" />
            <path d="M5.2 3.2v1.2M10.8 3.2v1.2" />
            <rect x="3.9" y="4.4" width="8.2" height="8.6" rx="3.4" />
            <path d="M8 13v1.8" />
            <path d="M7.1 16.2l.9-.9.9.9" />
          </svg>
          <span>新手指引</span>
        </button>
        <ThemeToggle />
      </nav>
      {/* 路由金线：每次切页重挂载，自左向右扫过后淡出（转场指示器） */}
      {!splash && <div key={page} className="route-bar" aria-hidden />}
      {!splash && (
        <div className="zh-corner" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      {/* 揭幕转场幕布：guide ↔ 功能页时盖满全屏，台前小人登台表演后整幕隐去 */}
      {veil && <CraftVeil craft={veil.craft} a={veil.a} b={veil.b} />}
      {/* 返回新手指引：从指引跳去体验后亮起，随时可回原站续逛 */}
      {!splash && phase === 'app' && page !== 'guide' && fromGuide && (
        <button
          type="button"
          className="guide-return"
          onClick={() => navigate('guide')}
          title={`回到新手指引 · 从第 ${guideStepIndex() + 1} 站续逛`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M4 2h8l-1.4 8.2a2.5 2.5 0 0 1-2.47 2.14H7.87A2.5 2.5 0 0 1 5.4 10.2Z" />
            <path d="M8 2V.8M5 7.2h6" />
          </svg>
          <span>返回新手指引</span>
          <em>第 {guideStepIndex() + 1} 站</em>
        </button>
      )}
      <main className="app-body" id="main-content" tabIndex={-1}>
        <div key={page} className="page-transition">
          {page === 'home' && <Home onNavigate={navigate} entered={!splash} />}
          {page === 'guide' && (
            <Guide
              onNavigate={navigate}
              onExit={() => {
                // 主动离馆（回首页 / 走完全程）不亮返回钮
                setFromGuide(false)
                navigate('home')
              }}
            />
          )}
          {page === 'chat' && <Chat initialQuery={chatQuery} />}
          {/* key 随参数重挂载：关键词预填/详情打开都由初始状态承担，避免 effect 同步 setState */}
          {page === 'knowledge' && (
            <Knowledge key={kbParam ?? 'kb-list'} openParam={kbParam} onNavigate={navigate} />
          )}
          {page === 'graph' && <KnowledgeGraph onNavigate={navigate} />}
          {page === 'map' && <MapPage onNavigate={navigate} openRegion={mapParam} />}
          {page === 'masters' && (
            <Masters key={masterParam ?? 'ms-list'} openParam={masterParam} onNavigate={navigate} />
          )}
          {page === 'path' && <Path />}
          {page === 'lab' && <Lab />}
          {page === 'challenge' && <Challenge onNavigate={navigate} />}
          {page === 'profile' && <ProfilePage onLogout={logout} />}
          {page === 'about' && <About />}
        </div>
      </main>
    </div>
  )
}

export default App
