/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：核心原创：新手导览十一站层层递进（灯线进度 + 站台照片渐变融底 + 四式版面轮换 +
 * 灯笼与站台同色 + 断点续览）
 */
import { useEffect, useState, type CSSProperties } from 'react'
import Motif from '../components/Motif'
import { STEPS, type CraftKey, type Variant } from '../guideStations'
import '../styles/guide.css'

interface Props {
  /** 去体验某页：跳到真实功能页；可选带上当前站的揭幕视觉（专属小人 + 主色） */
  onNavigate: (page: string, veil?: { craft: CraftKey; b: string }) => void
  /** 结束导览：回到首页 */
  onExit: () => void
}

const STEP_KEY = 'cm-guide-step'
const DONE_KEY = 'cm-guide-done'
const LAST = STEPS.length - 1

/** 各版面的要点序号字体：卷一壹贰 / 台阶零一 / 舆图甲乙（墨戏无序号） */
const NUM: Record<Variant, string[]> = {
  scroll: ['壹', '贰', '叁', '肆', '伍'],
  ink: [],
  steps: ['01', '02', '03', '04', '05'],
  map: ['甲', '乙', '丙', '丁', '戊'],
}

/** 读入上回逛到的站次（越界/损坏时回第 1 站）。
    断点语义：STEP_KEY 始终指向「上次读到的站」——中途「去体验」会把断点刷新为当前站；
    仅当断点仍在终点且已走完全程（DONE）时，整馆重开从第 1 站再逛。 */
function readSaved(): number {
  try {
    const n = parseInt(localStorage.getItem(STEP_KEY) ?? '0', 10)
    const saved = Number.isFinite(n) && n >= 0 && n <= LAST ? n : 0
    if (saved === LAST && localStorage.getItem(DONE_KEY) === '1') return 0
    return saved
  } catch {
    return 0
  }
}

export default function Guide({ onNavigate, onExit }: Props) {
  const [step, setStep] = useState(readSaved)
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(DONE_KEY) === '1'
    } catch {
      return false
    }
  })
  const s = STEPS[step]

  const persist = (i: number) => {
    setStep(i)
    try {
      const prev = readSaved()
      if (i > prev) localStorage.setItem(STEP_KEY, String(i))
    } catch {
      /* 隐私模式/存储满：仅保留内存态 */
    }
  }

  const go = (i: number) => persist(Math.min(LAST, Math.max(0, i)))
  const next = () => {
    if (step >= LAST) {
      try {
        localStorage.setItem(DONE_KEY, '1')
        // 断点落在终点，配合 DONE 让下次入馆从第 1 站整馆重开
        localStorage.setItem(STEP_KEY, String(LAST))
      } catch {
        /* 忽略存储失败 */
      }
      setDone(true)
      onExit()
      return
    }
    go(step + 1)
  }
  const restart = () => {
    try {
      localStorage.removeItem(STEP_KEY)
      localStorage.removeItem(DONE_KEY)
    } catch {
      /* 忽略存储失败 */
    }
    setDone(false)
    persist(0)
  }

  // 键盘：← → 翻站，Esc 回首页
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') go(step - 1)
      else if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const pct = (step / LAST) * 100

  /** 去体验：把当前站记为返回断点，并带上本站专属小人与主色交给 App 做揭幕转场 */
  const goTry = () => {
    try {
      localStorage.setItem(STEP_KEY, String(step))
    } catch {
      /* 忽略存储失败 */
    }
    onNavigate(s.page, { craft: s.craft, b: s.hexb })
  }

  return (
    <div
      className="guide-page"
      style={
        { '--gd-accent': s.tone, '--lantern-color': s.lantern } as CSSProperties
      }
    >
      <header className="guide-head">
        <div>
          <h1>新手指引</h1>
          <p>十一站一步一景 · 顺着灯线层层逛进承脉</p>
        </div>
        <div className="guide-head-acts">
          {done && (
            <span className="guide-done-seal" title="上次已走完全程，可随时再逛">
              已走全程
            </span>
          )}
          <button type="button" className="guide-close" onClick={onExit}>
            回首页
          </button>
        </div>
      </header>

      {/* 灯线进度：十一个站次一字排开，走过的路描金点亮，当前站亮起站色 */}
      <nav className="guide-steps" aria-label="导览进度">
        <div className="guide-track">
          <div className="guide-line" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </div>
          {STEPS.map((t, i) => (
            <button
              key={t.page}
              type="button"
              className={`guide-stop ${i < step ? 'is-past' : ''} ${i === step ? 'is-now' : ''}`}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`第 ${i + 1} 站 · ${t.title}`}
              title={`第 ${i + 1} 站 · ${t.title}`}
              onClick={() => go(i)}
            >
              <span className="guide-dot">{String(i + 1).padStart(2, '0')}</span>
              <span className="guide-stop-name">{t.short}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 站牌：key 随站次重挂载，换站即换景；照片以渐变方式融入卡面背景，四式版面轮换 */}
      <section
        key={step}
        className={`guide-card v-${s.variant}`}
        style={{ '--gd-accent': s.tone } as CSSProperties}
      >
        {/* 站台照片背景：十一张同铺一框，换站交叉渐隐渐显，右侧浓、左缘淡，直融卡底 */}
        <div className="guide-bg" aria-hidden>
          {STEPS.map((t, i) => (
            <img
              key={t.page}
              src={t.img}
              alt=""
              className={i === step ? 'on' : ''}
              draggable={false}
            />
          ))}
        </div>

        <div className="guide-txt">
          <div className="guide-meta">
            <span className="guide-no">
              第 {step + 1} 站 · {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
            </span>
            <span className="guide-tag">{s.tag}</span>
          </div>
          <span className="guide-hook" aria-hidden>
            {s.hook}
          </span>
          <h2 data-seal={s.seal}>{s.title}</h2>
          <p className="guide-copy">{s.line}</p>
          <ul className="guide-pts">
            {s.points.map((p, i) => (
              <li key={p} style={{ '--pi': `${0.1 + i * 0.08}s` } as CSSProperties}>
                {NUM[s.variant][i] && <span className="guide-pt-no">{NUM[s.variant][i]}</span>}
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="guide-acts">
            <button type="button" className="guide-prev" disabled={step === 0} onClick={() => go(step - 1)}>
              上一步
            </button>
            <button type="button" className="guide-go" onClick={goTry}>
              去「{s.title}」看看
            </button>
            <button type="button" className="guide-next" onClick={next}>
              {step >= LAST ? '走完全程 · 回首页' : '下一步'}
            </button>
          </div>
        </div>

        {/* 落款点缀：小小一方印章浮于照片景上，右下角添四字注与站次，随换站重落 */}
        <span className="guide-mini-seal" aria-hidden>
          {s.seal}
        </span>
        <em className="guide-seal-note">{s.sealNote}</em>
        <span className="guide-seal-count" aria-hidden>
          站次 {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </span>
      </section>

      <footer className="guide-foot">
        {step > 0 && (
          <button type="button" className="guide-restart" onClick={restart}>
            从头逛起
          </button>
        )}
        <span>方向键 ← → 翻页 · Esc 回首页</span>
      </footer>

      <Motif kind="lantern" />
    </div>
  )
}