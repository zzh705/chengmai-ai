import { useState } from 'react'
import Chat from './pages/Chat'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Lab from './pages/Lab'

type Page = 'chat' | 'graph' | 'lab'

const NAV: { key: Page; label: string }[] = [
  { key: 'chat', label: '承脉 AI' },
  { key: 'graph', label: '知识图谱' },
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
        {page === 'graph' && <KnowledgeGraph />}
        {page === 'lab' && <Lab />}
      </main>
    </div>
  )
}

export default App
