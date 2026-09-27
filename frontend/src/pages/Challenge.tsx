import { useEffect, useState } from 'react'
import { fetchProfile, type Profile } from '../api/progress'
import '../styles/challenge.css'

interface Props {
  onNavigate: (page: string, query?: string) => void
}

interface Badge {
  name: string
  icon: string
  desc: string
  earned: boolean
}

export default function Challenge({ onNavigate }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile().then(setProfile).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="ch-page ch-center">⚠️ {error}</div>
  if (!profile) return <div className="ch-page ch-center">加载中…</div>

  const { quiz, stats } = profile
  const pct = Math.round(quiz.accuracy * 100)

  const badges: Badge[] = [
    { icon: '🌱', name: '初识非遗', desc: '浏览 3 项非遗', earned: stats.viewed_items >= 3 },
    { icon: '📝', name: '勤学好问', desc: '完成 1 份学习计划', earned: stats.learning_plans >= 1 },
    { icon: '🎯', name: '答题新秀', desc: '累计答题 10 道', earned: quiz.answered >= 10 },
    { icon: '🏆', name: '非遗达人', desc: '正确率达 80%', earned: quiz.answered >= 5 && quiz.accuracy >= 0.8 },
    { icon: '💡', name: '创意传承人', desc: '完成 1 次活化创作', earned: stats.creations >= 1 },
    { icon: '👑', name: '承脉大师', desc: '答题 30 道且正确率 90%', earned: quiz.answered >= 30 && quiz.accuracy >= 0.9 },
  ]
  const earned = badges.filter((b) => b.earned).length

  return (
    <div className="ch-page">
      <header className="ch-header">
        <h1>非遗挑战</h1>
        <p>在对话中答题积累成绩，解锁传承徽章</p>
      </header>

      <div className="ch-hero">
        <div className="ch-ring" style={{ '--pct': pct } as React.CSSProperties}>
          <div className="ch-ring-inner">
            <strong>{quiz.answered > 0 ? `${pct}%` : '—'}</strong>
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
        <button className="ch-cta" onClick={() => onNavigate('chat', '给我出一套非遗测试题，我要挑战')}>
          🎯 去答题
        </button>
      </div>

      <section className="ch-section">
        <h2>🏅 传承徽章</h2>
        <div className="ch-badges">
          {badges.map((b) => (
            <div key={b.name} className={`ch-badge ${b.earned ? 'earned' : ''}`}>
              <span className="ch-badge-icon">{b.earned ? b.icon : '🔒'}</span>
              <strong>{b.name}</strong>
              <em>{b.desc}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="ch-section">
        <h2>📊 分主题战绩</h2>
        {profile.quiz_by_topic.length === 0 ? (
          <p className="ch-empty">还没有答题记录，先去和承脉 AI 答几道题吧</p>
        ) : (
          profile.quiz_by_topic.map((t) => (
            <div key={t.topic} className="ch-topic">
              <span className="ch-topic-name">{t.topic}</span>
              <div className="ch-topic-bar">
                <div className="ch-topic-fill" style={{ width: `${t.accuracy * 100}%` }} />
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
