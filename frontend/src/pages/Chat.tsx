import { Fragment, useEffect, useRef, useState } from 'react'
import {
  streamChat,
  type Action,
  type ChatResponse,
  type ChatMeta,
  type Source,
} from '../api/chat'
import { sendChat } from '../api/chat'
import { fetchLearningPlan, type LearningPlan } from '../api/learning'
import { generateQuiz, type QuizResponse } from '../api/quiz'
import { generateStory, type StoryResponse } from '../api/story'
import { recordProgress } from '../api/progress'
import { cleanLLM, stripEmojiDeep } from '../utils/text'
import { useTheme } from '../utils/theme'
import Motif from '../components/Motif'
import '../styles/chat.css'

type Mode = 'scholar' | 'inheritor' | 'youth'

const MODES: { key: Mode; label: string; desc: string }[] = [
  { key: 'scholar', label: '学者', desc: '历史文献 · 学术严谨' },
  { key: 'inheritor', label: '传承人', desc: '技艺工序 · 经验诀窍' },
  { key: 'youth', label: '青年传播者', desc: '通俗故事 · 创意表达' },
]

/** 模式特写：切模式时展示该模式的专属气质（剪影 + 文案），只在未开始对话时出现 */
const SHOWCASE: Record<
  Mode,
  { kanji: string; lede: string; points: string[]; example: string }
> = {
  scholar: {
    kanji: '读典',
    lede: '以文献与名录为据，一字一句讲求出处；不戏说、不附会，回答必附来源。',
    points: ['史料考据，言必有据', '辨析源流与版本异说', '来源与证据均可溯源'],
    example: '苏绣为什么被称为「针尖上的江南」？',
  },
  inheritor: {
    kanji: '守艺',
    lede: '从选料到成器，把一门手艺拆成可以跟着做的工序，点出火候与诀窍。',
    points: ['核心工序逐步拆解', '关键诀窍与常见误区', '工具材料一并说明'],
    example: '把宜兴紫砂壶的制作工序讲给我听',
  },
  youth: {
    kanji: '潮传',
    lede: '用故事与网感表达，让年轻人主动转发。',
    points: ['通俗故事与生活类比', '面向同学与留学生的讲法', '给出可直接分享的表达'],
    example: '用三句话把京剧脸谱讲给外国朋友',
  },
}

const MODE_STORE_KEY = 'chengmai_mode'

const INTENT_LABELS: Record<string, string> = {
  LEARNING: '学习',
  QUIZ: '测验',
  STORY: '故事',
  CREATION: '创作活化',
  COMPARE: '对比',
  INFO: '知识问答',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  data?: ChatResponse
  streaming?: boolean
  /** 本轮回答失败：气泡以错误样式呈现并对读屏播报 */
  failed?: boolean
}

/** 轻量排版：标题 / 列表 / 段落 / 强调，让长回答像文档而非聊天串。
 *  同时兜底清洗 LLM 常见的 Markdown 残留：分隔线（*** / ---）、孤立的 # 与 **。 */
type Seg = { t: 'h4' | 'h5' | 'ul' | 'ol' | 'p'; lines: string[] }

function renderProse(text: string): React.ReactNode {
  const blocks = cleanLLM(text)
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b && !/^(-{3,}|\*{3,}|_{3,})$/.test(b))

  const segs: Seg[] = []
  for (const b of blocks) {
    for (const raw of b.split('\n')) {
      const line = raw.trim()
      if (!line || /^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue
      const heading = line.match(/^(#{1,6})\s+(.+)$/)
      const kind: Seg['t'] = heading
        ? heading[1].length <= 2
          ? 'h4'
          : 'h5'
        : /^\s*[-*]\s+/.test(line)
          ? 'ul'
          : /^\s*\d+[.、)]\s*/.test(line)
            ? 'ol'
            : 'p'
      const top = segs[segs.length - 1]
      if (top && top.t === kind) top.lines.push(line)
      else segs.push({ t: kind, lines: [line] })
    }
  }

  return segs.map((seg, i) => {
    if (seg.t === 'h4') return <h4 key={i}>{inline(seg.lines[0].replace(/^#{1,6}\s+/, ''))}</h4>
    if (seg.t === 'h5') return <h5 key={i}>{inline(seg.lines[0].replace(/^#{1,6}\s+/, ''))}</h5>
    if (seg.t === 'ul')
      return (
        <ul key={i}>
          {seg.lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ''))}</li>
          ))}
        </ul>
      )
    if (seg.t === 'ol')
      return (
        <ol key={i}>
          {seg.lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\s*\d+[.、)]\s*/, ''))}</li>
          ))}
        </ol>
      )
    return (
      <p key={i}>
        {seg.lines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(l)}
          </Fragment>
        ))}
      </p>
    )
  })
}

function inline(text: string): React.ReactNode {
  let s = text
  const nodes: React.ReactNode[] = []
  if (!/(\*\*|__|\*|`)/.test(s)) return s
  // 依次抽出 粗体 / 行内代码 / 斜体，剩余孤立标记直接剥掉
  const token = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = token.exec(s))) {
    if (m.index > last) nodes.push(fixups(s.slice(last, m.index)))
    const part = m[0]
    if (part.startsWith('**') || part.startsWith('__'))
      nodes.push(<strong key={m.index}>{part.slice(2, -2)}</strong>)
    else if (part.startsWith('`'))
      nodes.push(
        <code key={m.index} className="inline-code">
          {part.slice(1, -1)}
        </code>,
      )
    else nodes.push(<em key={m.index}>{part.slice(1, -1)}</em>)
    last = m.index + part.length
  }
  if (last < s.length) nodes.push(fixups(s.slice(last)))
  return nodes
}

/** 残留的 ** / * 标记（未配对的）直接剥掉，避免原样露出 */
function fixups(text: string): string {
  return text.replace(/\*{1,2}/g, '')
}

function metaFrom(m: ChatMeta): ChatResponse {
  const { type: _type, ...rest } = m
  return { code: 0, answer: '', ...rest }
}

/** 模式剪影小景：月洞门里的中式场景（学者夜读 / 传承人执锤 / 青年放鸢） */
function ModeScene({ mode }: { mode: Mode }) {
  return (
    <svg
      viewBox="0 0 360 320"
      className={`msc-svg s-${mode}`}
      role="img"
      aria-label={
        mode === 'scholar' ? '窗下夜读剪影' : mode === 'inheritor' ? '匠人执锤剪影' : '青年放鸢剪影'
      }
    >
      <defs>
        <radialGradient id="mscMoon" cx="42%" cy="34%" r="75%">
          <stop offset="0%" className="mo-a" />
          <stop offset="100%" className="mo-b" />
        </radialGradient>
        <clipPath id="mscClip">
          <circle cx="180" cy="150" r="118" />
        </clipPath>
      </defs>
      <circle cx="180" cy="150" r="118" fill="url(#mscMoon)" />
      <g clipPath="url(#mscClip)">
        <ellipse cx="180" cy="258" rx="110" ry="18" className="msc-floor" />
        <path d="M78 252 Q180 236 282 252" className="msc-ground" />
        {mode === 'scholar' && (
          <g className="msc-star">
            <circle cx="238" cy="74" r="2.2" />
            <circle cx="262" cy="106" r="1.7" />
            <circle cx="222" cy="52" r="1.5" />
          </g>
        )}

      {mode === 'scholar' && (
        <g className="msc-ink">
          {/* 竹 */}
          <path d="M96 252 L100 96" className="msc-stalk" />
          <path d="M97 176 h7 M98 130 h7" className="msc-node" />
          <path d="M100 122 q22 8 36 -8 q-24 -4 -36 8z" />
          <path d="M99 152 q-22 4 -30 -12 q22 0 30 12z" />
          <path d="M98 196 q20 10 36 -2 q-22 -6 -36 2z" />
          {/* 夜读高士 */}
          <path d="M150 252 C148 218 154 200 170 194 C186 189 200 197 206 212 L214 252 Z" />
          <circle cx="184" cy="180" r="12" />
          <circle cx="188" cy="165" r="5" />
          <path
            d="M164 220 L184 212 L186 224 L166 232 Z M186 212 L206 216 L204 228 L186 224 Z"
            className="msc-book"
          />
        </g>
      )}

      {mode === 'inheritor' && (
        <g className="msc-ink">
          {/* 砧案与器皿 */}
          <rect x="212" y="216" width="66" height="12" />
          <path d="M220 228 v22 M270 228 v22" className="msc-stalk" />
          <path d="M262 216 C262 206 264 202 269 202 C274 202 276 206 276 216 Z" />
          {/* 执锤匠人 */}
          <path d="M118 254 C116 224 122 206 136 202 C150 199 160 208 164 222 L170 254 Z" />
          <circle cx="142" cy="188" r="12" />
          <circle cx="146" cy="173" r="5" />
          <path d="M154 214 L186 182" className="msc-arm" />
          <rect x="171" y="175" width="30" height="13" transform="rotate(45 186 182)" />
          {/* 火星 */}
          <path d="M218 208 l4 6 -4 6 -4 -6z" className="msc-spark" />
          <path d="M230 198 l3 5 -3 5 -3 -5z" className="msc-spark" />
          <path d="M208 196 l3 5 -3 5 -3 -5z" className="msc-spark" />
        </g>
      )}

      {mode === 'youth' && (
        <g>
          <g className="msc-ink">
            {/* 放鸢青年 */}
            <path d="M110 254 C108 228 114 212 126 209 C139 206 148 214 152 226 L157 254 Z" />
            <circle cx="133" cy="196" r="12" />
            <path d="M122 196 q-14 0 -18 12 q10 -2 18 -6z" />
            <path d="M145 218 L172 188" className="msc-arm" />
            {/* 风筝 */}
            <path d="M258 80 L282 104 L258 132 L234 104 Z" />
          </g>
          <path d="M172 188 Q216 142 256 106" className="msc-string" />
          <path d="M258 80 V132 M234 104 H282" className="msc-kite-line" />
          <path d="M258 132 q12 14 0 26 q-12 12 2 24" className="msc-tail" />
          <circle cx="257" cy="157" r="3" className="msc-spark" />
          <circle cx="259" cy="181" r="3" className="msc-spark" />
        </g>
      )}
      </g>
      <circle cx="180" cy="150" r="118" className="msc-ring" />
    </svg>
  )
}

export default function Chat({ initialQuery }: { initialQuery?: string }) {
  const theme = useTheme()
  const lightTone = theme === 'light'
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const v = localStorage.getItem(MODE_STORE_KEY)
      if (v === 'scholar' || v === 'inheritor' || v === 'youth') return v
    } catch {
      /* 隐私模式：忽略 */
    }
    return 'youth'
  })
  /**
   * 特写入场交给全局转场时序：vt-running 期间入场动画统一推迟 0.34s（VT 后段起跑），
   * 真实 DOM 揭示时特写已在淡入进程中，与页面溶解连成一笔，不弹跳。
   * 手动切模式无 vt-running，按自身 --d 错峰即时播放。
   */
  /** 模式切换方向（正=向右），驱动特写卡入场方位 */
  const modeDirRef = useRef(1)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [plans, setPlans] = useState<Record<number, LearningPlan>>({})
  const [quizzes, setQuizzes] = useState<Record<number, QuizResponse>>({})
  const [stories, setStories] = useState<Record<number, StoryResponse>>({})
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  /** 页内非阻断提示条（替代 alert），3.6 秒后自动消失 */
  const [notice, setNotice] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 发送中的同步锁（loading 是状态、落库有延迟，挡不住同 tick 的双调） */
  const sendingRef = useRef(false)

  useEffect(
    () => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    },
    [],
  )

  function showNotice(msg: string) {
    setNotice(msg)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 3600)
  }

  /** 抄录回答：写入剪贴板，成败都给一句纸面提示 */
  async function copyAnswer(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      showNotice('回答已抄录，可粘贴至别处')
    } catch {
      showNotice('浏览器未允许复制，请手动选取文字')
    }
  }

  // 流式期间持续贴底，结束后停止接管
  useEffect(() => {
    if (!loading) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, loading])

  function topicFor(msgIndex: number, data: ChatResponse): string | undefined {
    // 主题优先取知识库关联项，否则回退到该回答之前的用户原话
    const related = data.related_items[0]?.name
    if (related) return related
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content
    }
    return undefined
  }

  function patchLast(fn: (m: Message) => Message) {
    setMessages((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = fn(next[i])
          break
        }
      }
      return next
    })
  }

  async function send(text: string) {
    // 同步防重：StrictMode 下挂载 effect 双跑会在 loading 落库前连发两路 SSE，
    // 两路 delta 交错写进同一条气泡（出字重叠错乱）；ref 判定是同步的，可拦住
    if (!text || sendingRef.current) return
    sendingRef.current = true
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true },
    ])
    setInput('')
    setLoading(true)
    let streamed = false
    // delta 节流缓冲：SSE 每 1-3 字一个 chunk，若逐字 setState 会让整条消息
    // （含 Markdown 全量重解析 + 证据链 JSX）每秒重渲染数十次，长回答越到后面越卡。
    // 60ms 批量 flush 一次（约 16fps），出字观感依旧连贯，渲染量降约一个数量级。
    let pending = ''
    let lastFlush = 0
    let flushTimer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      flushTimer = null
      if (!pending) return
      const chunk = pending
      pending = ''
      lastFlush = performance.now()
      patchLast((m) => ({ ...m, content: m.content + chunk }))
    }
    try {
      await streamChat(
        { message: text, mode, session_id: sessionId },
        {
          onMeta: (meta) => {
            setSessionId(meta.session_id)
            const data = metaFrom(meta)
            if (data.related_items.length > 0) {
              const it = data.related_items[0]
              recordProgress('view', { id: it.id, name: it.name })
            }
            patchLast((m) => ({ ...m, data }))
          },
          onDelta: (t) => {
            streamed = true
            pending += t
            if (flushTimer === null) {
              const wait = Math.max(0, 60 - (performance.now() - lastFlush))
              flushTimer = setTimeout(flush, wait)
            }
          },
          onDone: () => patchLast((m) => ({ ...m, streaming: false })),
        },
      )
      if (flushTimer !== null) clearTimeout(flushTimer)
      flush() // 收尾：保证最后一批字不丢失
      if (!streamed) throw new Error('流式连接中断')
      patchLast((m) => ({ ...m, streaming: false }))
    } catch (e) {
      // 流式不可用时回退一次性接口，保证功能不退化
      if (flushTimer !== null) clearTimeout(flushTimer)
      pending = ''
      try {
        const data = await sendChat({ message: text, mode, session_id: sessionId })
        setSessionId(data.session_id)
        if (data.related_items.length > 0) {
          const it = data.related_items[0]
          recordProgress('view', { id: it.id, name: it.name })
        }
        patchLast(() => ({ role: 'assistant', content: data.answer, data }))
      } catch {
        patchLast(() => ({
          role: 'assistant',
          content: `方才答话出了岔子，请稍候重试，或换个问法。（${e instanceof Error ? e.message : '未知错误'}）`,
          streaming: false,
          failed: true,
        }))
      }
    } finally {
      sendingRef.current = false
      setLoading(false)
    }
  }

  // 首页搜索框带过来的问题：挂载时自动发送一次
  useEffect(() => {
    if (initialQuery) void send(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSend() {
    await send(input.trim())
  }

  async function handleAction(msgIndex: number, action: Action, data: ChatResponse) {
    const topic = topicFor(msgIndex, data)
    if (!topic || actionBusy) return
    const key = `${msgIndex}:${action.type}`
    setActionBusy(key)
    try {
      if (action.type === 'learning_plan') {
        const plan = await fetchLearningPlan(topic, 7)
        setPlans((prev) => ({ ...prev, [msgIndex]: stripEmojiDeep(plan) }))
        recordProgress('learning_plan', { name: topic })
      } else if (action.type === 'quiz') {
        const quiz = await generateQuiz(topic, 3)
        setQuizzes((prev) => ({ ...prev, [msgIndex]: stripEmojiDeep(quiz) }))
      } else if (action.type === 'story') {
        const story = await generateStory(topic)
        setStories((prev) => ({ ...prev, [msgIndex]: stripEmojiDeep(story) }))
      } else if (action.type === 'lab') {
        showNotice('请在顶部导航打开「活化实验室」')
        return
      }
    } catch (e) {
      showNotice(e instanceof Error ? e.message : '操作失败')
    } finally {
      setActionBusy(null)
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return
    const idx = (m: Mode) => MODES.findIndex((x) => x.key === m)
    modeDirRef.current = Math.sign(idx(next) - idx(mode)) || 1
    setMode(next)
    try {
      localStorage.setItem(MODE_STORE_KEY, next)
    } catch {
      /* 隐私模式：忽略 */
    }
  }

  const modeIdx = MODES.findIndex((x) => x.key === mode)
  const modeMeta = MODES[modeIdx]
  const show = SHOWCASE[mode]

  function pick(msgIndex: number, qid: number, option: string) {
    setPicks((prev) => ({ ...prev, [`${msgIndex}-${qid}`]: option }))
    const quiz = quizzes[msgIndex]
    const q = quiz?.questions.find((x) => x.id === qid)
    if (quiz && q) {
      recordProgress('quiz_answer', { name: quiz.topic }, { correct: option === q.answer })
    }
  }

  return (
    <div className="chat-page" data-mode={mode}>
      <header className="chat-header">
        <h1>承脉 AI</h1>
        <p>让 AI 读懂非遗，让年轻人成为传承者</p>
        <div className="mode-tabs">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={mode === m.key ? 'active' : ''}
              onClick={() => switchMode(m.key)}
              title={m.desc}
            >
              {m.label}模式
            </button>
          ))}
        </div>
      </header>

      <div
        className="chat-list"
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="与承脉 AI 的对话记录"
      >
        {messages.length === 0 && (
          <div
            className="mode-showcase"
            key={mode}
            style={{ '--dir': modeDirRef.current } as React.CSSProperties}
          >
            <div className="msc-copy">
              <span className="msc-kanji" aria-hidden>
                {show.kanji}
              </span>
              <div className="msc-body">
                <h2>
                  {modeMeta.label}
                  <em>模式</em>
                </h2>
                <p className="msc-lede">{show.lede}</p>
                <ul className="msc-points">
                  {show.points.map((p, i) => (
                    <li key={p}>
                      <i>{String(i + 1).padStart(2, '0')}</i>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="msc-hint">试试问我：{show.example}</p>
              </div>
            </div>
            <div className="msc-scene">
              <ModeScene mode={mode} />
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`bubble ${msg.role}${msg.failed ? ' failed' : ''}`}
            role={msg.failed ? 'alert' : undefined}
          >
            {msg.role === 'user' ? (
              <div className="bubble-content">{msg.content}</div>
            ) : (
              <div className="answer">
                <div className={`bubble-content${msg.streaming && !msg.content ? ' waiting' : ''}`}>
                  {msg.content ? (
                    msg.streaming ? (
                      <div className="answer-text chat-streaming-text" key="text">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="answer-text" key="text">
                        {renderProse(msg.content)}
                      </div>
                    )
                  ) : (
                    <span className="thinking" key="think">
                      <i className="think-dots" aria-hidden>
                        <b />
                        <b />
                        <b />
                      </i>
                      {msg.data ? '正在组织回答…' : '检索知识库并核对来源'}
                    </span>
                  )}
                </div>

                {/* 落款行：回答完毕后钤一方朱印，右侧附抄录按钮 */}
                {!msg.streaming && msg.content && !msg.failed && (
                  <div className="answer-sign">
                    <button
                      className="answer-copy"
                      onClick={() => copyAnswer(msg.content)}
                      aria-label="复制这段回答"
                    >
                      复制本答
                    </button>
                    <span className="answer-seal" aria-hidden>
                      承
                    </span>
                  </div>
                )}

                {msg.data && (
                  <div className="bubble-meta">
                    <div className="meta-block sources-block">
                      <div className="meta-label">
                        资料依据
                        <span className="meta-label-note">
                          {msg.data.sources.length === 0
                            ? '暂未找到权威资料'
                            : `共 ${msg.data.sources.length} 条`}
                        </span>
                      </div>
                      {msg.data.sources.map((s: Source, idx) => (
                        <div key={s.id} className="source-item">
                          <span className="source-no">{idx + 1}</span>
                          <span className="source-title">{s.title}</span>
                          <span className="source-pub">{s.publisher}</span>
                        </div>
                      ))}
                    </div>
                    <div className="meta-stats">
                      <span>
                        意图 {INTENT_LABELS[msg.data.intent] ?? msg.data.intent}
                      </span>
                      {msg.data.evidence_score.total > 0 && (
                        <span className="evidence">
                          依据强度
                          <i>
                            <b
                              style={{
                                width: `${(msg.data.evidence_score.total * 100).toFixed(0)}%`,
                              }}
                            />
                          </i>
                          {(msg.data.evidence_score.total * 100).toFixed(0)}%
                        </span>
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
                        <div className="card-overline">学习路线 · 7 天</div>
                        <div className="plan-title">「{plans[i].topic}」七日学习计划</div>
                        {plans[i].sources.length > 0 && (
                          <span className="plan-src">
                            参考知识库：{plans[i].sources.join('、')}
                          </span>
                        )}
                        <div className="plan-days">
                          {plans[i].days.map((d) => (
                            <div key={d.day} className="plan-day">
                              <div className="plan-day-head">
                                <span className="plan-day-no">
                                  第 {String(d.day).padStart(2, '0')} 天
                                </span>
                                <span className="plan-day-title">{d.title}</span>
                              </div>
                              <ul>
                                {d.tasks.map((t, ti) => (
                                  <li key={ti}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {quizzes[i] && (
                      <div className="quiz-card">
                        <div className="card-overline">知识挑战</div>
                        <div className="plan-title">「{quizzes[i].topic}」随堂三问</div>
                        {quizzes[i].sources.length > 0 && (
                          <span className="plan-src">依据：{quizzes[i].sources.join('、')}</span>
                        )}
                        {quizzes[i].questions.map((q) => {
                          const picked = picks[`${i}-${q.id}`]
                          return (
                            <div key={q.id} className="quiz-q">
                              <div className="quiz-question">
                                <span className="quiz-no">{q.id}</span>
                                {q.question}
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
                                  <strong className={picked === q.answer ? 'ok' : 'no'}>
                                    {picked === q.answer ? '答对了。' : '答错了。'}
                                  </strong>
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
                        <div className="card-overline">可传播故事</div>
                        <div className="plan-title">{stories[i].title}</div>
                        {stories[i].sections.map((s, si) => (
                          <div key={si} className="story-section">
                            <strong>{s.heading}</strong>
                            <p>{s.content}</p>
                          </div>
                        ))}
                        {stories[i].spread_tips.length > 0 && (
                          <div className="story-tips">
                            <div className="card-overline">传播建议</div>
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
            )}
          </div>
        ))}
      </div>

      {notice && (
        <div className="chat-notice" role="status">
          {notice}
        </div>
      )}

      <footer className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // 输入法组词期间（isComposing）不触发发送，避免回车确认候选词时误发
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) void handleSend()
          }}
          placeholder="输入你想了解的非遗…"
          aria-label="向承脉 AI 提问"
        />
        <button onClick={handleSend} disabled={loading}>
          发送
        </button>
      </footer>

      {/* 墨竹双影：主色随问答模式流转（学者青碧/传承人朱红/青年描金），与模式卡片气质一致 */}
      <Motif
        kind="bamboo"
        tone={
          mode === 'scholar'
            ? lightTone
              ? 'rgba(54, 112, 94, 0.52)'
              : 'rgba(79, 143, 123, 0.5)'
            : mode === 'inheritor'
              ? lightTone
                ? 'rgba(159, 48, 36, 0.5)'
                : 'rgba(176, 58, 46, 0.5)'
              : lightTone
                ? 'rgba(150, 115, 31, 0.52)'
                : 'rgba(232, 197, 107, 0.5)'
        }
      />
    </div>
  )
}
