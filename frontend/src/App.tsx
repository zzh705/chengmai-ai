import { useState } from 'react'
import Chat from './pages/Chat'
import Knowledge from './pages/Knowledge'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Lab from './pages/Lab'
import Path from './pages/Path'

type Page = 'chat' | 'knowledge' | 'graph' | 'path' | 'lab'

const NAV: { key: Page; label: string }[] = [
  { key: 'chat', label: '承脉 AI' },
  { key: 'knowledge', label: '非遗知识库' },
  { key: 'graph', label: '知识图谱' },
  { key: 'path', label: '学习路径' },
  { key: 'lab', label: '活化实验室' },
]

function App() {
  const [page, setPage] = useState<Page>('chat')

  return (
    <div className="app-shell">
      <nav className="app-nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={page === n.key ? 'active' : ''}
            onClick={() => setPage(n.key)}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <main className="app-body">
        {page === 'chat' && <Chat />}
        {page === 'knowledge' && <Knowledge />}
        {page === 'graph' && <KnowledgeGraph />}
        {page === 'path' && <Path />}
        {page === 'lab' && <Lab />}
      </main>
    </div>
  )
}

export default App
