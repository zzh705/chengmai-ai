/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：核心原创：新手导览十一站层层递进（灯线进度 + 字印站牌 + 去体验跳转 + 断点续览）
 */
import { useEffect, useState, type CSSProperties } from 'react'
import Motif from '../components/Motif'
import '../styles/guide.css'

interface Props {
  /** 去体验某页：跳到真实功能页 */
  onNavigate: (page: string) => void
  /** 结束导览：回到首页 */
  onExit: () => void
}

interface GuideStep {
  page: string
  title: string
  /** 导航条短名 */
  short: string
  /** 一句话定位 */
  tag: string
  line: string
  points: string[]
  /** 站牌大字 */
  seal: string
  sealNote: string
  /** 站台主色（CSS 变量名） */
  tone: string
}

/** 十一站：按主站导航序层层递进，每站对应一个功能页面，文案与页面实况一一对应 */
const STEPS: GuideStep[] = [
  {
    page: 'home',
    title: '首页',
    short: '首页',
    tag: '门面',
    line: '全站的门面与总入口，进来先落落脚。',
    points: [
      '「问 AI」输入框，一句话直达承脉 AI 对话',
      '今日非遗、一分钟认识，从悬念走进项目详情',
      '地域探索与非遗全景，一眼看遍分布与数据',
      '我的学习进度，把足迹收进首页',
    ],
    seal: '启',
    sealNote: '开卷见山',
    tone: 'var(--vermilion)',
  },
  {
    page: 'chat',
    title: '承脉 AI',
    short: '承脉AI',
    tag: '三释',
    line: '非遗多智能体在这里坐堂，问什么都有来处。',
    points: [
      '学者 / 传承人 / 青年传播者，三种视角随时切换',
      '回答逐字流式生成，并附来源与证据分',
      '从首页、名家风采等地带问题进入，直接开问',
      '追问续聊，一路把话题聊深',
    ],
    seal: '问',
    sealNote: '三声各有答',
    tone: 'var(--jade)',
  },
  {
    page: 'knowledge',
    title: '非遗知识库',
    short: '知识库',
    tag: '深读',
    line: '全量名录在此归档，逐条可查、逐档案可读。',
    points: [
      '关键词搜索 + 十大类筛选，3299 项名录在册',
      '深读档案：钩子、工序、时间线与文化内涵',
      '语音讲解随点随停，浏览进度自动记录',
    ],
    seal: '读',
    sealNote: '下笔知来处',
    tone: 'var(--gold)',
  },
  {
    page: 'graph',
    title: '知识图谱',
    short: '图谱',
    tag: '族谱',
    line: '一张会呼吸的非遗族谱，关系触手可及。',
    points: [
      '根 → 十大类 → 项目 → 传承人，四级层层舒展',
      '拖拽、缩放、搜索，一点即见节点详情',
      '三千星尘环带，拟全量收录的星野',
    ],
    seal: '系',
    sealNote: '千丝一线牵',
    tone: 'var(--viz-indigo)',
  },
  {
    page: 'map',
    title: '非遗地图',
    short: '地图',
    tag: '舆图',
    line: '沿华夏地理铺开，非遗的分布一目了然。',
    points: [
      '舆图与方格双视图，山河形胜由你切换',
      '点选省份，看当地名录与热度色阶',
      '「带我去一个省」，随手开启一场云游',
    ],
    seal: '览',
    sealNote: '舆图入九州',
    tone: 'var(--jade)',
  },
  {
    page: 'masters',
    title: '名家风采',
    short: '名家',
    tag: '溯源',
    line: '先认得北斗，再望星河万千。',
    points: [
      '十六位开宗立派的源头人物，星河里的北斗',
      '肖像、生平年表与代表作品，逐位深读',
      '「向承脉 AI 问起」，把好奇续进对话',
    ],
    seal: '仰',
    sealNote: '星河识北斗',
    tone: 'var(--vermilion)',
  },
  {
    page: 'path',
    title: '学习路径',
    short: '路径',
    tag: '精进',
    line: '把兴趣排成一条路，一天一坎走上去。',
    points: [
      '输入一个主题，选择天数、目标与每日时长',
      '一键生成分日计划：日卡打卡、里程碑递进',
      '「抄录路线」，整案带进课堂与社团',
    ],
    seal: '行',
    sealNote: '书山自卷开',
    tone: 'var(--gold)',
  },
  {
    page: 'lab',
    title: '活化实验室',
    short: '实验室',
    tag: '活化',
    line: '让古老手艺，长出新世代的模样。',
    points: [
      '选定非遗、写下需求，方案即刻生成',
      '输出文案、活动、短视频等多种形制',
      '风格与受众可定制，整案可抄录、历史可回看',
    ],
    seal: '创',
    sealNote: '古艺焕新枝',
    tone: 'var(--viz-indigo)',
  },
  {
    page: 'challenge',
    title: '非遗挑战',
    short: '挑战',
    tag: '试锋',
    line: '学过的都算数，三题一试见真章。',
    points: [
      '每日一题：AI 现场出题，即答即评',
      '五款迷你游艺坊，战绩与挑战同档记账',
      '正确率、连对、打卡联动，攒下六枚传承徽章',
    ],
    seal: '试',
    sealNote: '三题试锋芒',
    tone: 'var(--vermilion)',
  },
  {
    page: 'profile',
    title: '个人中心',
    short: '个人',
    tag: '档案',
    line: '每一次浏览与作答，都在这里留下印痕。',
    points: [
      '传承人名片与称号之路，成长看得见',
      '集印册八枚印章，达成条件即盖印',
      '兴趣雷达、答题分析与浏览足迹，同页复盘',
    ],
    seal: '籍',
    sealNote: '印留岁月痕',
    tone: 'var(--gold)',
  },
  {
    page: 'about',
    title: '关于项目',
    short: '关于',
    tag: '立心',
    line: '一切声明可验证，这是承脉的立身之本。',
    points: [
      '项目简介与设计理念，认识承脉的来路',
      '系统架构与多智能体分工，口径公开可查',
      '数据、图片许可逐条可验，里程碑一路走来',
    ],
    seal: '承',
    sealNote: '一脉承至今',
    tone: 'var(--jade)',
  },
]

const STEP_KEY = 'cm-guide-step'
const DONE_KEY = 'cm-guide-done'
const LAST = STEPS.length - 1

/** 读入上回逛到的站次（越界/损坏时回第 1 站） */
function readSaved(): number {
  try {
    const n = parseInt(localStorage.getItem(STEP_KEY) ?? '0', 10)
    return Number.isFinite(n) && n >= 0 && n <= LAST ? n : 0
  } catch {
    return 0
  }
}

export default function Guide({ onNavigate, onExit }: Props) {
  const [step, setStep] = useState(() => (readSaved() >= LAST ? 0 : readSaved()))
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

  return (
    <div className="guide-page">
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

      {/* 灯线进度：十一个站次一字排开，走过的路被描金点亮 */}
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

      {/* 站牌：key 随站次重挂载，换站即换景 */}
      <section
        key={step}
        className="guide-card"
        style={{ '--gd-accent': s.tone } as CSSProperties}
      >
        <div className="guide-txt">
          <div className="guide-meta">
            <span className="guide-no">
              第 {step + 1} 站 · {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
            </span>
            <span className="guide-tag">{s.tag}</span>
          </div>
          <h2>{s.title}</h2>
          <p className="guide-copy">{s.line}</p>
          <ul className="guide-pts">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="guide-acts">
            <button type="button" className="guide-prev" disabled={step === 0} onClick={() => go(step - 1)}>
              上一步
            </button>
            <button type="button" className="guide-go" onClick={() => onNavigate(s.page)}>
              去「{s.title}」看看
            </button>
            <button type="button" className="guide-next" onClick={next}>
              {step >= LAST ? '走完全程 · 回首页' : '下一步'}
            </button>
          </div>
        </div>
        <aside className="guide-panel" aria-hidden>
          <span className="guide-seal">{s.seal}</span>
          <em className="guide-seal-note">{s.sealNote}</em>
          <span className="guide-seal-count">
            站次 {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
        </aside>
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