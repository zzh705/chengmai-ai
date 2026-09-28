import { useEffect, useMemo, useState } from 'react'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import { fetchProfile, recordProgress, type Profile } from '../api/progress'
import { generateQuiz, type QuizQuestion } from '../api/quiz'
import { calcRank } from '../utils/rank'
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

  useEffect(() => {
    fetchProfile().then(setProfile).catch((e) => setError(e.message))
    fetchHeritageList().then(setList).catch(() => setList([]))
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

  function pick(opt: string) {
    if (!q || picked) return
    setPicked(opt)
    const correct = opt === q.answer
    recordProgress('quiz_answer', { name: dailyTopic }, { correct, question: q.question })
    // 即时刷新档案：正确率/等级条随答题变化
    fetchProfile().then(setProfile).catch(() => {})
  }

  if (error) return <div className="ch-page ch-center">{error}</div>
  if (!profile) return <div className="ch-page ch-center">加载中…</div>

  const { quiz, stats } = profile
  const pct = Math.round(quiz.accuracy * 100)

  const toPct = (cur: number, goal: number) => Math.max(0, Math.min(100, Math.round((cur / goal) * 100)))
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
        <div className="ch-ring" style={{ '--pct': shownPct } as React.CSSProperties}>
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

      {/* 每日一题：AI 即时出题、即答即评 */}
      <section className="ch-section">
        <div className="ch-daily-head">
          <h2>每日一题{daily ? ` · ${daily.name}` : ''}</h2>
          <button className="ch-daily-refresh" disabled={qLoading} onClick={drawQuestion}>
            {qLoading ? '出题中…' : q ? '换一题' : '抽一题'}
          </button>
        </div>
        <div className="ch-daily-body">
          {!q && !qLoading && !qError && (
            <p className="ch-daily-hint">
              今日主题「{dailyTopic}」：点右上角抽题，AI 从知识库现场出题，答完立即判分并计入档案。
            </p>
          )}
          {qLoading && (
            <div className="ch-q-skeleton" aria-hidden>
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
                  <strong>{picked === q.answer ? '答对了 · EXP +6' : '答错了，看看解析'}</strong>
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          )}
        </div>
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
    </div>
  )
}
