import { useState } from 'react'
import Chat from './pages/Chat'
import Home from './pages/Home'
import Knowledge from './pages/Knowledge'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Lab from './pages/Lab'
import Path from './pages/Path'
import ProfilePage from './pages/Profile'

type Page = 'home' | 'chat' | 'knowledge' | 'graph' | 'path' | 'lab' | 'profile'

const NAV: { key: Page; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'chat', label: '承脉 AI' },
  { key: 'knowledge', label: '非遗知识库' },
  { key: 'graph', label: '知识图谱' },
  { key: 'path', label: '学习路径' },
  { key: 'lab', label: '活化实验室' },
  { key: 'profile', label: '传承档案' },
]

function App() {
  const [page, setPage] = useState<Page>('home')
  const [chatQuery, setChatQuery] = useState<string | undefined>(undefined)

  function navigate(target: string, query?: string) {
    setPage(target as Page)
    if (target === 'chat') {
      // 每次带新问题进对话页都生成新值，触发 Chat 重新挂载并自动发送
      setChatQuery(query)
    }
  }

  return (
    <div className="app-shell">
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
          {page === 'knowledge' && <Knowledge />}
          {page === 'graph' && <KnowledgeGraph />}
          {page === 'path' && <Path />}
          {page === 'lab' && <Lab />}
          {page === 'profile' && <ProfilePage />}
        </div>
      </main>
    </div>
  )
}

export default App
