import { useState } from 'react'
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

function App() {
  // 开屏仪式动画：App 挂载播一次（路由切换不重播），点击/跳过/3.4s 自动结束
  const [splash, setSplash] = useState(true)
  const [page, setPage] = useState<Page>('home')
  const [chatQuery, setChatQuery] = useState<string | undefined>(undefined)
  const [kbParam, setKbParam] = useState<string | undefined>(undefined)
  const [mapParam, setMapParam] = useState<string | undefined>(undefined)

  /** 导航并携带参数：chat=问题文本，knowledge=项目 id 或 kw:关键词，map=省份 key */
  function navigate(target: string, param?: string) {
    setPage(target as Page)
    if (target === 'chat') {
      // 每次带新问题进对话页都生成新值，触发 Chat 重新挂载并自动发送
      setChatQuery(param)
    }
    if (target === 'knowledge') setKbParam(param)
    if (target === 'map') setMapParam(param)
  }

  return (
    <div className="app-shell">
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
      <main className="app-body">
        <div key={page} className="page-transition">
          {page === 'home' && <Home onNavigate={navigate} />}
          {page === 'chat' && <Chat initialQuery={chatQuery} />}
          {/* key 随参数重挂载：关键词预填/详情打开都由初始状态承担，避免 effect 同步 setState */}
          {page === 'knowledge' && <Knowledge key={kbParam ?? 'kb-list'} openParam={kbParam} />}
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
