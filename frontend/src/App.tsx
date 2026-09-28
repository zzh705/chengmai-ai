import { useState } from 'react'
import { flushSync } from 'react-dom'
import Splash from './components/Splash'
import About from './pages/About'
import Chat from './pages/Chat'
import Challenge from './pages/Challenge'
import Home from './pages/Home'
import Knowledge from './pages/Knowledge'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Lab from './pages/Lab'
import MapPage from './pages/Map'
import Path from './pages/Path'
import ProfilePage from './pages/Profile'

type Page =
  | 'home'
  | 'chat'
  | 'knowledge'
  | 'graph'
  | 'map'
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
  { key: 'path', label: '学习路径' },
  { key: 'lab', label: '活化实验室' },
  { key: 'challenge', label: '非遗挑战' },
  { key: 'profile', label: '传承档案' },
  { key: 'about', label: '关于项目' },
]

const HAS_VIEW_TRANSITION =
  typeof document !== 'undefined' &&
  'startViewTransition' in document &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (HAS_VIEW_TRANSITION) document.documentElement.classList.add('has-vt')

/**
 * 页面风味：切页入场各有气质（fade 沉静 / rise 展卷 / drift 入舆 / ink 墨晕 / lift 上榜），
 * 金线扫光按页面组换色；方向感知由 --vt-x（正=向右切，负=回切）驱动位移。
 */
const MOOD: Record<string, { in: string; dur: string; a: string; b: string }> = {
  home: { in: 'vtInFade', dur: '0.44s', a: '#e8c56b', b: '#b03a2e' },
  chat: { in: 'vtInFade', dur: '0.46s', a: '#e8c56b', b: '#b03a2e' },
  knowledge: { in: 'vtInRise', dur: '0.5s', a: '#e8c56b', b: '#4f8f7b' },
  graph: { in: 'vtInRise', dur: '0.5s', a: '#e8c56b', b: '#4f8f7b' },
  map: { in: 'vtInDrift', dur: '0.56s', a: '#e8c56b', b: '#4f8f7b' },
  path: { in: 'vtInInk', dur: '0.62s', a: '#e8c56b', b: '#b03a2e' },
  lab: { in: 'vtInInk', dur: '0.62s', a: '#e8c56b', b: '#b03a2e' },
  challenge: { in: 'vtInLift', dur: '0.44s', a: '#d4763b', b: '#e8c56b' },
  profile: { in: 'vtInLift', dur: '0.44s', a: '#d4763b', b: '#e8c56b' },
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
  // 开屏仪式动画：App 挂载播一次（路由切换不重播），点击/跳过/3.4s 自动结束
  const [splash, setSplash] = useState(true)
  const [page, setPage] = useState<Page>('home')
  const [chatQuery, setChatQuery] = useState<string | undefined>(undefined)
  const [kbParam, setKbParam] = useState<string | undefined>(undefined)
  const [mapParam, setMapParam] = useState<string | undefined>(undefined)

  /** 导航并携带参数：chat=问题文本，knowledge=项目 id 或 kw:关键词，map=省份 key */
  function navigate(target: string, param?: string) {
    // 方向感知：按导航序判断前进/回切，决定入场方向与金线扫光起点
    const from = NAV.findIndex((n) => n.key === page)
    const to = NAV.findIndex((n) => n.key === target)
    const dir = from >= 0 && to >= 0 && from !== to ? Math.sign(to - from) : 1
    applyPageMood(target, dir)
    const apply = () => {
      setPage(target as Page)
      if (target === 'chat') {
        // 每次带新问题进对话页都生成新值，触发 Chat 重新挂载并自动发送
        setChatQuery(param)
      }
      if (target === 'knowledge') setKbParam(param)
      if (target === 'map') setMapParam(param)
    }
    if (HAS_VIEW_TRANSITION) {
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> }
      }
      setVtRunning(true)
      const t = doc.startViewTransition?.(() => flushSync(apply))
      // 转场结束后留 0.75s 余量（入场动画时长 ≤0.7s），等动画播完再撤销延迟，
      // 避免 animation-delay 回跳导致已播内容闪变
      t?.finished
        .then(() => {
          vtCleanupTimer = setTimeout(() => setVtRunning(false), 750)
        })
        .catch(() => {
          vtCleanupTimer = setTimeout(() => setVtRunning(false), 750)
        })
      if (!t) {
        apply()
        setVtRunning(false)
      }
    } else {
      apply()
    }
  }

  return (
    <div className={`app-shell ${splash ? 'pre-splash' : 'entered'}`}>
      {splash && <Splash onDone={() => setSplash(false)} />}
      <nav className="app-nav">
        <span className="app-brand" onClick={() => navigate('home')}>
          承脉
        </span>
        <div className="app-nav-links">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={page === n.key ? 'active' : ''}
              onClick={() => navigate(n.key)}
            >
              {n.label}
            </button>
          ))}
        </div>
      </nav>
      {/* 路由金线：每次切页重挂载，自左向右扫过后淡出（转场指示器） */}
      {!splash && <div key={page} className="route-bar" aria-hidden />}
      <main className="app-body">
        <div key={page} className="page-transition">
          {page === 'home' && <Home onNavigate={navigate} entered={!splash} />}
          {page === 'chat' && <Chat initialQuery={chatQuery} />}
          {/* key 随参数重挂载：关键词预填/详情打开都由初始状态承担，避免 effect 同步 setState */}
          {page === 'knowledge' && (
            <Knowledge key={kbParam ?? 'kb-list'} openParam={kbParam} onNavigate={navigate} />
          )}
          {page === 'graph' && <KnowledgeGraph onNavigate={navigate} />}
          {page === 'map' && <MapPage onNavigate={navigate} openRegion={mapParam} />}
          {page === 'path' && <Path />}
          {page === 'lab' && <Lab />}
          {page === 'challenge' && <Challenge onNavigate={navigate} />}
          {page === 'profile' && <ProfilePage />}
          {page === 'about' && <About />}
        </div>
      </main>
    </div>
  )
}

export default App
