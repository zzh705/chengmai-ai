/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：非遗挑战页：正确率环、八边形图案传承徽章、分主题战绩与错题本
 */
import { useEffect, useMemo, useState } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchProfile, recordProgress, type Profile } from '../api/progress'
import { generateQuiz, type QuizQuestion } from '../api/quiz'
import { calcRank } from '../utils/rank'
import Games from '../components/Games'
import type { GameRound } from '../components/games/types'
import Motif from '../components/Motif'
import '../styles/challenge.css'

interface Props {
  onNavigate: (page: string, query?: string) => void
}

interface Badge {
  name: string
  desc: string
  earned: boolean
  /** 解锁进度（0-100 百分比） */
  pct: number
}

// 模块加载时算一次今日序号（与首页同规则，每日轮换出题主题）
const DAY_INDEX = (() => {
  const start = new Date(new Date().getFullYear(), 0, 0)
  return Math.floor((Date.now() - start.getTime()) / 86400000)
})()

const dayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const saveJSON = (key: string, val: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* 存储满/隐私模式：静默 */
  }
}

/** 错题本条目（本地留存，便于复盘） */
interface WrongQ {
  topic: string
  q: string
  options: string[]
  answer: string
  exp: string
}

/* 正确率环：viewBox 120 内的描边半径；pathLength 归一到 100，dashoffset 即百分比 */
const RING_R = 52

export default function Challenge({ onNavigate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [list, setList] = useState<HeritageSummary[]>([])
  const [error, setError] = useState('')
  /** 下一帧才写入实际正确率，让环形进度从 0 平滑生长 */
  const [shownPct, setShownPct] = useState(0)
  const [rankShown, setRankShown] = useState(0)

  // 每日一题
  const [q, setQ] = useState<QuizQuestion | null>(null)
  const [qLoading, setQLoading] = useState(false)
  const [qError, setQError] = useState('')
  const [picked, setPicked] = useState<string | null>(null)

  // 连对 / 本周打卡 / 错题本（本地持久化）
  const [streak, setStreak] = useState(() => loadJSON('ch_streak', 0))
  const [days, setDays] = useState<string[]>(() => loadJSON('ch_days', [] as string[]))
  const [wrongs, setWrongs] = useState<WrongQ[]>(() => loadJSON('ch_wrongs', [] as WrongQ[]))
  const [openWrong, setOpenWrong] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile().then(setProfile).catch((e) => setError(`档案暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`))
    fetchHeritageList('deep').then(setList).catch(() => setList([]))
  }, [])

  useEffect(() => {
    if (!profile) return
    const target =
      profile.quiz.answered > 0 ? Math.round(profile.quiz.accuracy * 100) : 0
    const t = requestAnimationFrame(() => setShownPct(target))
    return () => cancelAnimationFrame(t)
  }, [profile])

  const rank = useMemo(() => (profile ? calcRank(profile) : null), [profile])

  useEffect(() => {
    if (!rank) return
    const t = requestAnimationFrame(() => setRankShown(rank.pct))
    return () => cancelAnimationFrame(t)
  }, [rank])

  const daily = list.length ? list[DAY_INDEX % list.length] : null
  const dailyTopic = daily?.name ?? '中华非物质文化遗产'

  async function drawQuestion() {
    setQLoading(true)
    setQError('')
    setPicked(null)
    setQ(null)
    try {
      const r = await generateQuiz(dailyTopic, 1)
      const first = r.questions[0]
      if (!first) throw new Error('没有返回题目，再试一次')
      setQ(first)
    } catch (e) {
      setQError(e instanceof Error ? e.message : '出题失败')
    } finally {
      setQLoading(false)
    }
  }

  async function pick(opt: string) {
    if (!q || picked) return
    setPicked(opt)
    const correct = opt === q.answer
    const synced = recordProgress('quiz_answer', { name: dailyTopic }, { correct, question: q.question })
    if (correct) {
      const ns = streak + 1
      setStreak(ns)
      saveJSON('ch_streak', ns)
      const d = dayStr()
      if (!days.includes(d)) {
        const next = [...days, d].slice(-60)
        setDays(next)
        saveJSON('ch_days', next)
      }
    } else {
      setStreak(0)
      saveJSON('ch_streak', 0)
      if (!wrongs.some((w) => w.q === q.question)) {
        const next: WrongQ[] = [
          { topic: dailyTopic, q: q.question, options: q.options, answer: q.answer, exp: q.explanation },
          ...wrongs,
        ].slice(0, 20)
        setWrongs(next)
        saveJSON('ch_wrongs', next)
      }
    }
    // 即时刷新档案：等进度落库后再读，避免写后读竞态
    synced.then(() => fetchProfile()).then(setProfile).catch(() => {})
  }

  // 游艺坊每局结算：与每日一题同口径记账（正确率/分主题/连对/打卡/错题/徽章自动联动）
  async function handleGameRound(r: GameRound) {
    const synced = recordProgress(
      'quiz_answer',
      { name: r.topic },
      { correct: r.correct, question: r.wrong?.q ?? r.summary, source: 'game', score: r.score },
    )
    if (r.correct) {
      const ns = streak + 1
      setStreak(ns)
      saveJSON('ch_streak', ns)
      const d = dayStr()
      if (!days.includes(d)) {
        const next = [...days, d].slice(-60)
        setDays(next)
        saveJSON('ch_days', next)
      }
    } else {
      setStreak(0)
      saveJSON('ch_streak', 0)
      if (r.wrong && !wrongs.some((w) => w.q === r.wrong?.q)) {
        const next: WrongQ[] = [
          { topic: r.topic, q: r.wrong.q, options: [r.wrong.answer], answer: r.wrong.answer, exp: r.wrong.exp },
          ...wrongs,
        ].slice(0, 20)
        setWrongs(next)
        saveJSON('ch_wrongs', next)
      }
    }
    await synced
    fetchProfile().then(setProfile).catch(() => {})
  }

  function removeWrong(qText: string) {
    const next = wrongs.filter((w) => w.q !== qText)
    setWrongs(next)
    saveJSON('ch_wrongs', next)
    setOpenWrong(null)
  }

  /** 本周一至周日的打卡情况 */
  const week = useMemo(() => {
    const today = new Date()
    const dow = (today.getDay() + 6) % 7
    const labels = ['一', '二', '三', '四', '五', '六', '日']
    const out: { ds: string; label: string; date: number; done: boolean; today: boolean }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - dow + i)
      const ds = dayStr(d)
      out.push({ ds, label: labels[i], date: d.getDate(), done: days.includes(ds), today: ds === dayStr() })
    }
    return out
  }, [days])
  const weekDone = week.filter((d) => d.done).length

  function reloadProfile() {
    setError('')
    fetchProfile()
      .then(setProfile)
      .catch((e) => setError(`档案暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`))
    fetchHeritageList('deep')
      .then(setList)
      .catch(() => setList([]))
  }

  if (error)
    return (
      <div className="ch-page ch-center" role="alert">
        <p className="ch-center-msg">{error}</p>
        <button className="ch-center-retry" onClick={reloadProfile}>
          重试
        </button>
      </div>
    )
  if (!profile)
    return (
      <div className="ch-page ch-center" role="status">
        加载中…
      </div>
    )

  const { quiz, stats } = profile
  const pct = Math.round(quiz.accuracy * 100)

  const toPct = (cur: number, goal: number) => Math.max(0, Math.min(100, Math.round((cur / goal) * 100)))

  /** 徽章 SVG 图案：六枚各不相同，统一用八边形印章外形 + 中心纹饰
   *  已解锁用描金/朱红/青碧原色，未解锁用墨灰底表「待启」 */
  const BadgeIcon = ({ name, earned }: { name: string; earned: boolean }) => {
    const c = earned ? 'var(--gold)' : 'var(--ink-faint)'
    const c2 = earned ? 'var(--vermilion)' : 'var(--ink-3)'
    const c3 = earned ? 'var(--jade)' : 'var(--ink-3)'
    const fill = earned ? 'rgba(217,164,65,0.1)' : 'rgba(140,130,118,0.06)'
    // 八边形印章底
    const octagon =
      'M32,4 L52,12 L60,32 L52,52 L32,60 L12,52 L4,32 L12,12 Z'
    return (
      <svg viewBox="0 0 64 64" className="ch-badge-svg" aria-hidden="true">
        <path d={octagon} fill={fill} stroke={c} strokeWidth="1.5" />
        {name === '初识非遗' && (
          /* 一只睁开的眼睛 + 三道光毫：表「初见非遗」 */
          <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M16,32 Q32,22 48,32 Q32,42 16,32 Z" />
            <circle cx="32" cy="32" r="4" fill={c2} stroke="none" />
            <path d="M32,14 L32,20 M22,17 L25,22 M42,17 L39,22" opacity="0.7" />
          </g>
        )}
        {name === '勤学好问' && (
          /* 半展卷轴 + 三行字：表「勤学」 */
          <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M14,18 L50,18 L50,46 L14,46 Z" />
            <path d="M14,18 Q10,18 10,22 Q10,26 14,26" fill={fill} />
            <path d="M50,18 Q54,18 54,22 Q54,26 50,26" fill={fill} />
            <path d="M20,28 L44,28 M20,34 L44,34 M20,40 L38,40" strokeWidth="1.2" opacity="0.8" />
          </g>
        )}
        {name === '答题新秀' && (
          /* 一枚方印 + 朱泥色块：表「答题盖章」 */
          <g>
            <rect x="18" y="18" width="28" height="28" rx="3" fill={c2} opacity="0.85" />
            <rect x="18" y="18" width="28" height="28" rx="3" fill="none" stroke={c} strokeWidth="1.5" />
            <text x="32" y="37" textAnchor="middle" fontSize="14" fill="#faf5e9" fontWeight="700" fontFamily="serif">答</text>
          </g>
        )}
        {name === '非遗达人' && (
          /* 玉璧同心圆：表「圆满意足」 */
          <g stroke={c3} strokeWidth="2" fill="none">
            <circle cx="32" cy="32" r="16" fill={fill} />
            <circle cx="32" cy="32" r="11" />
            <circle cx="32" cy="32" r="6" fill={c3} stroke="none" opacity="0.85" />
            <circle cx="32" cy="32" r="2" fill="#faf5e9" stroke="none" />
          </g>
        )}
        {name === '创意传承人' && (
          /* 一支毛笔 + 墨点迸溅：表「活化创作」 */
          <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M20,46 L36,30" />
            <path d="M36,30 L40,26 L44,30 L40,34 Z" fill={c2} stroke="none" />
            <path d="M20,46 L17,49" strokeWidth="2.5" />
            <circle cx="44" cy="40" r="1.5" fill={c} stroke="none" opacity="0.7" />
            <circle cx="48" cy="36" r="1" fill={c} stroke="none" opacity="0.5" />
            <circle cx="46" cy="44" r="1.2" fill={c2} stroke="none" opacity="0.6" />
          </g>
        )}
        {name === '承脉大师' && (
          /* 八芒星日轮：表「承脉之巅」 */
          <g stroke={c} strokeWidth="1.8" fill="none">
            <circle cx="32" cy="32" r="6" fill={c} stroke="none" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * Math.PI) / 4
              return (
                <line
                  key={i}
                  x1={32 + Math.cos(a) * 9}
                  y1={32 + Math.sin(a) * 9}
                  x2={32 + Math.cos(a) * (i % 2 ? 14 : 18)}
                  y2={32 + Math.sin(a) * (i % 2 ? 14 : 18)}
                  strokeWidth={i % 2 ? 1.2 : 2}
                  opacity={i % 2 ? 0.6 : 1}
                />
              )
            })}
            <circle cx="32" cy="32" r="20" strokeWidth="0.8" opacity="0.3" strokeDasharray="2 3" />
          </g>
        )}
      </svg>
    )
  }

  const badges: Badge[] = [
    {
      name: '初识非遗',
      desc: '浏览 3 项非遗',
      earned: stats.viewed_items >= 3,
      pct: toPct(stats.viewed_items, 3),
    },
    {
      name: '勤学好问',
      desc: '完成 1 份学习计划',
      earned: stats.learning_plans >= 1,
      pct: toPct(stats.learning_plans, 1),
    },
    {
      name: '答题新秀',
      desc: '累计答题 10 道',
      earned: quiz.answered >= 10,
      pct: toPct(quiz.answered, 10),
    },
    {
      name: '非遗达人',
      desc: '正确率达 80%',
      earned: quiz.answered >= 5 && quiz.accuracy >= 0.8,
      pct:
        quiz.answered >= 5
          ? Math.min(100, Math.round((quiz.accuracy / 0.8) * 100))
          : toPct(quiz.answered, 5) * 0.5,
    },
    {
      name: '创意传承人',
      desc: '完成 1 次活化创作',
      earned: stats.creations >= 1,
      pct: toPct(stats.creations, 1),
    },
    {
      name: '承脉大师',
      desc: '答题 30 道且正确率 90%',
      earned: quiz.answered >= 30 && quiz.accuracy >= 0.9,
      pct: Math.min(
        toPct(quiz.answered, 30),
        quiz.accuracy > 0 ? Math.round((quiz.accuracy / 0.9) * 100) : 0,
      ),
    },
  ]
  const earned = badges.filter((b) => b.earned).length

  return (
    <div className="ch-page">
      <header className="ch-header">
        <h1>非遗挑战</h1>
        <p>在对话中答题积累成绩，解锁传承徽章</p>
      </header>

      <div className="ch-hero">
        <div className="ch-ring">
          <svg
            className="ch-ring-svg"
            viewBox="0 0 120 120"
            role="img"
            aria-label={`正确率 ${quiz.answered > 0 ? pct : 0}%`}
          >
            <circle className="ch-ring-track" cx="60" cy="60" r={RING_R} />
            <circle
              className="ch-ring-prog"
              cx="60"
              cy="60"
              r={RING_R}
              pathLength={100}
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100 - shownPct,
              }}
            />
          </svg>
          <div className="ch-ring-inner">
            <strong>{quiz.answered > 0 ? `${pct}%` : '0%'}</strong>
            <span>正确率</span>
          </div>
        </div>
        <div className="ch-hero-stats">
          <div>
            <strong>{quiz.answered}</strong>
            <span>已答题目</span>
          </div>
          <div>
            <strong>{quiz.correct}</strong>
            <span>答对</span>
          </div>
          <div>
            <strong className={streak > 1 ? 'hot' : ''}>{streak}</strong>
            <span>连对</span>
          </div>
          <div>
            <strong>
              {earned}/{badges.length}
            </strong>
            <span>徽章</span>
          </div>
        </div>
        {rank && (
          <div className="ch-rank">
            <div className="ch-rank-head">
              <strong>
                Lv.{rank.level} · {rank.title}
              </strong>
              <span>{rank.exp} EXP</span>
            </div>
            <div className="ch-rank-bar">
              <i style={{ '--x': rankShown / 100 } as React.CSSProperties} />
            </div>
          </div>
        )}
        <button className="ch-cta" onClick={() => onNavigate('chat', '给我出一套非遗测试题，我要挑战')}>
          去答题
        </button>
      </div>

      {/* 本周打卡：连续传承的仪式感 */}
      <section className="ch-section">
        <div className="ch-week-head">
          <h2>本周打卡</h2>
          <span>
            {weekDone}/7 天{streak > 1 ? ` · 连对 ×${streak}` : ''}
          </span>
        </div>
        <div className="ch-week">
          {week.map((d) => (
            <div key={d.ds} className={`ch-week-day ${d.done ? 'on' : ''} ${d.today ? 'today' : ''}`}>
              <i>{d.label}</i>
              <b>{String(d.date).padStart(2, '0')}</b>
              <em>{d.done ? '已打卡' : d.today ? '今日' : '-'}</em>
            </div>
          ))}
        </div>
      </section>

      {/* 每日一题：AI 即时出题、即答即评 */}
      <section className="ch-section">
        <div className="ch-daily-head">
          <h2>每日一题{daily ? ` · ${daily.name}` : ''}</h2>
          <button className="ch-daily-refresh" disabled={qLoading} onClick={drawQuestion}>
            {qLoading ? '出题中…' : q ? '换一题' : '抽一题'}
          </button>
        </div>
        <div className="ch-daily-body" aria-live="polite" aria-busy={qLoading}>
          {!q && !qLoading && !qError && (
            <p className="ch-daily-hint">
              今日主题「{dailyTopic}」：点右侧「抽一题」，AI 从知识库现场出题，答完立即判分并计入档案。
            </p>
          )}
          {qLoading && (
            <div className="ch-q-skeleton" aria-busy aria-label="正在出题">
              <div className="skeleton ch-q-sk-line" />
              <div className="skeleton ch-q-sk-opt" />
              <div className="skeleton ch-q-sk-opt" />
            </div>
          )}
          {qError && (
            <p className="ch-q-error">
              {qError}
              <button onClick={drawQuestion}>重试</button>
            </p>
          )}
          {q && (
            <div className="ch-q-card">
              <p className="ch-q-text">{q.question}</p>
              <div className="ch-q-options">
                {q.options.map((o) => {
                  const state = !picked
                    ? ''
                    : o === q.answer
                      ? ' right'
                      : o === picked
                        ? ' wrong'
                        : ' dim'
                  return (
                    <button
                      key={o}
                      className={`ch-q-opt${state}`}
                      disabled={!!picked}
                      onClick={() => pick(o)}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
              {picked && (
                <div className={`ch-q-result ${picked === q.answer ? 'ok' : 'no'}`}>
                  <strong>
                    {picked === q.answer
                      ? `答对了${streak > 1 ? ` · 连对 ×${streak}` : ''}`
                      : '答错了，已收进错题本'}
                  </strong>
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 非遗游艺坊：剪纸/书法/翻牌/投令旗/点色五款小游戏，战绩与挑战同档 */}
      <Games onRound={handleGameRound} />

      {/* 错题本：答错的题自动收录，可复盘与移除 */}
      <section className="ch-section">
        <div className="ch-week-head">
          <h2>错题本</h2>
          <span>{wrongs.length > 0 ? `${wrongs.length} 道待复盘` : '暂无错题'}</span>
        </div>
        {wrongs.length === 0 ? (
          <p className="ch-empty">还没有错题，答错了会自动收进这里</p>
        ) : (
          wrongs.map((w, wi) => (
            <div key={w.q} className={`ch-wrong ${openWrong === w.q ? 'open' : ''}`}>
              <button
                className="ch-wrong-head"
                onClick={() => setOpenWrong(openWrong === w.q ? null : w.q)}
                aria-expanded={openWrong === w.q}
                aria-controls={`ch-wrong-body-${wi}`}
              >
                <span className="ch-wrong-topic">{w.topic}</span>
                <span className="ch-wrong-q">{w.q}</span>
                <em>{openWrong === w.q ? '收起' : '复盘'}</em>
              </button>
              {openWrong === w.q && (
                <div className="ch-wrong-body" id={`ch-wrong-body-${wi}`}>
                  <div className="ch-wrong-opts">
                    {w.options.map((o) => (
                      <span key={o} className={o === w.answer ? 'right' : ''}>
                        {o}
                        {o === w.answer ? '（正解）' : ''}
                      </span>
                    ))}
                  </div>
                  <p className="ch-wrong-exp">{w.exp}</p>
                  <button className="ch-wrong-ok" onClick={() => removeWrong(w.q)}>
                    已掌握 · 移出错题本
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section className="ch-section">
        <h2>传承徽章</h2>
        <div className="ch-badges">
          {badges.map((b, i) => (
            <div
              key={b.name}
              className={`ch-badge ${b.earned ? 'earned' : ''}`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <BadgeIcon name={b.name} earned={b.earned} />
              <strong>{b.name}</strong>
              <em>{b.desc}</em>
              {b.earned ? (
                <span className="ch-badge-flag">已解锁</span>
              ) : (
                <div className="ch-badge-prog">
                  <i style={{ '--x': b.pct / 100 } as React.CSSProperties} />
                  <span>{b.pct}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="ch-section">
        <h2>分主题战绩</h2>
        {profile.quiz_by_topic.length === 0 ? (
          <p className="ch-empty">还没有答题记录，先来一题每日挑战吧</p>
        ) : (
          profile.quiz_by_topic.map((t) => (
            <div key={t.topic} className="ch-topic">
              <span className="ch-topic-name">{t.topic}</span>
              <div className="ch-topic-bar">
                <div className="ch-topic-fill" style={{ '--x': t.accuracy } as React.CSSProperties} />
              </div>
              <span className="ch-topic-stat">
                {Math.round(t.accuracy * 100)}% · {t.correct}/{t.answered}
              </span>
            </div>
          ))
        )}
      </section>

      <Motif kind="banner" />
    </div>
  )
}
