import { useRef, useState } from 'react'
import { sendChat, type Action, type ChatResponse, type Source } from '../api/chat'
import { fetchLearningPlan, type LearningPlan } from '../api/learning'
import { generateQuiz, type QuizResponse } from '../api/quiz'
import { generateStory, type StoryResponse } from '../api/story'
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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [plans, setPlans] = useState<Record<number, LearningPlan>>({})
  const [quizzes, setQuizzes] = useState<Record<number, QuizResponse>>({})
  const [stories, setStories] = useState<Record<number, StoryResponse>>({})
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function topicFor(msgIndex: number, data: ChatResponse): string | undefined {
    // 主题优先取知识库关联项，否则回退到该回答之前的用户原话
    const related = data.related_items[0]?.name
    if (related) return related
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content
    }
    return undefined
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const data = await sendChat({ message: text, mode, session_id: sessionId })
      setSessionId(data.session_id)
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

  async function handleAction(msgIndex: number, action: Action, data: ChatResponse) {
    const topic = topicFor(msgIndex, data)
    if (!topic || actionBusy) return
    const key = `${msgIndex}:${action.type}`
    setActionBusy(key)
    try {
      if (action.type === 'learning_plan') {
        const plan = await fetchLearningPlan(topic, 7)
        setPlans((prev) => ({ ...prev, [msgIndex]: plan }))
      } else if (action.type === 'quiz') {
        const quiz = await generateQuiz(topic, 3)
        setQuizzes((prev) => ({ ...prev, [msgIndex]: quiz }))
      } else if (action.type === 'story') {
        const story = await generateStory(topic)
        setStories((prev) => ({ ...prev, [msgIndex]: story }))
      } else if (action.type === 'lab') {
        alert('请在顶部导航打开「活化实验室」')
        return
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setActionBusy(null)
    }
  }

  function pick(msgIndex: number, qid: number, option: string) {
    setPicks((prev) => ({ ...prev, [`${msgIndex}-${qid}`]: option }))
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
            <span>例如：什么是苏绣 / 把京剧讲给外国留学生听</span>
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
                    <button
                      key={a.type}
                      className="action-btn"
                      disabled={actionBusy === `${i}:${a.type}`}
                      onClick={() => handleAction(i, a, msg.data!)}
                    >
                      {actionBusy === `${i}:${a.type}` ? '生成中…' : a.label}
                    </button>
                  ))}
                </div>

                {plans[i] && (
                  <div className="plan-card">
                    <div className="plan-title">
                      📅「{plans[i].topic}」7 天学习路线
                      {plans[i].sources.length > 0 && (
                        <span className="plan-src">参考知识库：{plans[i].sources.join('、')}</span>
                      )}
                    </div>
                    {plans[i].days.map((d) => (
                      <div key={d.day} className="plan-day">
                        <strong>
                          Day {d.day} · {d.title}
                        </strong>
                        <ul>
                          {d.tasks.map((t, ti) => (
                            <li key={ti}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {quizzes[i] && (
                  <div className="quiz-card">
                    <div className="plan-title">
                      📝「{quizzes[i].topic}」知识挑战
                      {quizzes[i].sources.length > 0 && (
                        <span className="plan-src">依据：{quizzes[i].sources.join('、')}</span>
                      )}
                    </div>
                    {quizzes[i].questions.map((q) => {
                      const picked = picks[`${i}-${q.id}`]
                      return (
                        <div key={q.id} className="quiz-q">
                          <div className="quiz-question">
                            {q.id}. {q.question}
                          </div>
                          <div className="quiz-options">
                            {q.options.map((opt) => {
                              const chosen = picked === opt
                              const isAnswer = opt === q.answer
                              let cls = 'quiz-opt'
                              if (picked && isAnswer) cls += ' correct'
                              else if (chosen && !isAnswer) cls += ' wrong'
                              return (
                                <button
                                  key={opt}
                                  className={cls}
                                  disabled={!!picked}
                                  onClick={() => pick(i, q.id, opt)}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          {picked && (
                            <div className="quiz-explain">
                              {picked === q.answer ? '✅ 答对了！' : '❌ 答错了，'}解析：
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {stories[i] && (
                  <div className="story-card">
                    <div className="plan-title">📖 {stories[i].title}</div>
                    {stories[i].sections.map((s, si) => (
                      <div key={si} className="story-section">
                        <strong>{s.heading}</strong>
                        <p>{s.content}</p>
                      </div>
                    ))}
                    {stories[i].spread_tips.length > 0 && (
                      <div className="story-tips">
                        <strong>📢 传播建议</strong>
                        <ul>
                          {stories[i].spread_tips.map((t, ti) => (
                            <li key={ti}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
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
