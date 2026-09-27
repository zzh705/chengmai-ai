import { useState } from 'react'
import Chat from './pages/Chat'
import KnowledgeGraph from './pages/KnowledgeGraph'

type Page = 'chat' | 'graph'

const NAV: { key: Page; label: string }[] = [
  { key: 'chat', label: '承脉 AI' },
  { key: 'graph', label: '知识图谱' },
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
      <main className="app-body">{page === 'chat' ? <Chat /> : <KnowledgeGraph />}</main>
    </div>
  )
}

export default App
