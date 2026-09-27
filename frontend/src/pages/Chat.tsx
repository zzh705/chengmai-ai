import { useRef, useState } from 'react'
import { sendChat, type Action, type ChatResponse, type Source } from '../api/chat'
import '../styles/chat.css'

type Mode = 'scholar' | 'inheritor' | 'youth'

const MODES: { key: Mode; label: string; desc: string }[] = [
  { key: 'scholar', label: '学者', desc: '历史文献 · 学术严谨' },
  { key: 'inheritor', label: '传承人', desc: '技艺工序 · 经验诀窍' },
  { key: 'youth', label: '青年传播者', desc: '通俗故事 · 创意表达' },
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  data?: ChatResponse
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('youth')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const data = await sendChat({ message: text, mode })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, data }])
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }),
      )
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ 出错了：${e instanceof Error ? e.message : '未知错误'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <h1>承脉 AI</h1>
        <p>让 AI 读懂非遗，让年轻人成为传承者</p>
        <div className="mode-tabs">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={mode === m.key ? 'active' : ''}
              onClick={() => setMode(m.key)}
              title={m.desc}
            >
              {m.label}模式
            </button>
          ))}
        </div>
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            你想了解哪一种非遗？<br />
            <span>例如：什么是苏绣 / 我只有 10 分钟了解剪纸</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role}`}>
            <div className="bubble-content">{msg.content}</div>
            {msg.data && (
              <div className="bubble-meta">
                <div className="meta-block">
                  <strong>资料依据：</strong>
                  {msg.data.sources.length === 0
                    ? ' 暂未找到权威资料'
                    : msg.data.sources.map((s: Source, idx) => (
                        <div key={s.id} className="source-item">
                          {idx + 1}. {s.title}（{s.publisher}）
                        </div>
                      ))}
                </div>
                <div className="meta-block">
                  <strong>意图：</strong>
                  {msg.data.intent}
                  {msg.data.evidence_score.total > 0 && (
                    <>
                      {' · '}
                      <strong>依据强度：</strong>
                      {(msg.data.evidence_score.total * 100).toFixed(0)}%
                    </>
                  )}
                </div>
                <div className="action-row">
                  {msg.data.actions.map((a: Action) => (
                    <button key={a.type} className="action-btn">
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="bubble assistant loading">承脉 AI 思考中…</div>}
      </div>

      <footer className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入你想了解的非遗…"
        />
        <button onClick={handleSend} disabled={loading}>
          发送
        </button>
      </footer>
    </div>
  )
}
