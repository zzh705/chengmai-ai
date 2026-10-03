/**
 * 非遗游艺坊：五款非遗主题小游戏的入口与舞台。
 * 每局结算通过 onRound 上交挑战页：以 quiz_answer 计入正确率、分主题战绩、
 * 连对、本周打卡、错题本与徽章进度 —— 游戏是挑战的一部分，而非孤岛。
 */
import { useState, type ReactNode } from 'react'
import type { GameRound } from './games/types'
import PaperCut from './games/PaperCut'
import Calligraphy from './games/Calligraphy'
import MemoryTiles from './games/MemoryTiles'
import TruthFlags from './games/TruthFlags'
import DyePalette from './games/DyePalette'
import '../styles/games.css'

type GameId = 'papercut' | 'calligraphy' | 'memory' | 'truth' | 'dye'

interface Meta {
  id: GameId
  name: string
  claim: string
  desc: string
  Icon: () => ReactNode
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const GAMES: Meta[] = [
  {
    id: 'papercut',
    name: '剪纸补花',
    claim: '对折 · 识对称',
    desc: '红纸已下半边剪，选出严丝合缝的另一半',
    Icon: () => (
      <svg viewBox="0 0 48 48" {...stroke}>
        <path d="M24 6v36" strokeDasharray="3 3" />
        <path d="M24 12c-6-4-12 0-12 6 0 5 6 6 6 12s-6 7-6 12c0 6 6 10 12 6" />
        <path d="M24 18c3-2 6 0 6 3M24 30c3 2 6 0 6-3" />
      </svg>
    ),
  },
  {
    id: 'calligraphy',
    name: '书法临帖',
    claim: '运笔 · 临八字',
    desc: '米字格上描摹范字，看笔锋与间架像不像',
    Icon: () => (
      <svg viewBox="0 0 48 48" {...stroke}>
        <path d="M14 8h20v20H14z" opacity="0.45" />
        <path d="M14 18h20M24 8v20M14 28l20-20" opacity="0.45" />
        <path d="M31 26 18 39M14 35l10 4M17 29l-5 8 9 3" />
      </svg>
    ),
  },
  {
    id: 'memory',
    name: '纹样翻牌',
    claim: '记忆 · 配五对',
    desc: '团花、永字、古琴……十张牌中寻出五对纹样',
    Icon: () => (
      <svg viewBox="0 0 48 48" {...stroke}>
        <rect x="7" y="10" width="14" height="18" rx="2" />
        <rect x="27" y="10" width="14" height="18" rx="2" opacity="0.5" />
        <circle cx="14" cy="19" r="3.2" />
        <path d="M30 15h8M30 20h8M30 25h5" />
        <path d="M16 36h16" />
      </svg>
    ),
  },
  {
    id: 'truth',
    name: '投令旗',
    claim: '限时 · 辨真伪',
    desc: '八道非遗陈述，三息之内投出真或伪',
    Icon: () => (
      <svg viewBox="0 0 48 48" {...stroke}>
        <path d="M12 42V8" />
        <path d="M12 9h22l-5 7 5 7H12" />
        <path d="M20 32l5 4 8-9" />
      </svg>
    ),
  },
  {
    id: 'dye',
    name: '点色成画',
    claim: '施彩 · 染沙燕',
    desc: '为沙燕风筝点矿彩，配出传统正色',
    Icon: () => (
      <svg viewBox="0 0 48 48" {...stroke}>
        <path d="M24 10c-8 7-8 22 0 30 8-8 8-23 0-30Z" />
        <path d="M24 16c-7-4-15-2-17 5 6 1 12 3 17 8M24 16c7-4 15-2 17 5-6 1-12 3-17 8" />
      </svg>
    ),
  },
]

export default function Games({ onRound }: { onRound: (r: GameRound) => void }) {
  const [active, setActive] = useState<GameId | null>(null)
  const [roundNo, setRoundNo] = useState(0)
  const [result, setResult] = useState<GameRound | null>(null)

  const meta = GAMES.find((g) => g.id === active) ?? null

  function handleFinish(r: GameRound) {
    setResult(r)
    onRound(r)
  }

  function play(id: GameId) {
    setActive(id)
    setResult(null)
    setRoundNo((n) => n + 1)
  }

  function exit() {
    setActive(null)
    setResult(null)
  }

  const renderGame = (id: GameId) => {
    switch (id) {
      case 'papercut':
        return <PaperCut onFinish={handleFinish} />
      case 'calligraphy':
        return <Calligraphy onFinish={handleFinish} />
      case 'memory':
        return <MemoryTiles onFinish={handleFinish} />
      case 'truth':
        return <TruthFlags onFinish={handleFinish} />
      case 'dye':
        return <DyePalette onFinish={handleFinish} />
    }
  }

  return (
    <section className="ch-section ch-arcade">
      <div className="ch-week-head">
        <h2>非遗游艺坊</h2>
        <span>五艺雅集 · 战绩同档</span>
      </div>
      <p className="ch-arcade-intro">
        手上的技艺也是挑战：在游艺坊里过关，同样计入正确率、连对打卡、分主题战绩与徽章；失手的关窍会自动收进错题本复盘。
      </p>

      {!meta ? (
        <div className="ch-game-grid">
          {GAMES.map((g) => (
            <button key={g.id} className="ch-game-card" onClick={() => play(g.id)}>
              <span className="ch-game-ic">
                <g.Icon />
              </span>
              <strong>{g.name}</strong>
              <em>{g.claim}</em>
              <span>{g.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="gm-stage" role="group" aria-label={`${meta.name}游戏`}>
          <div className="gm-stage-head">
            <div>
              <strong>{meta.name}</strong>
              <em>{meta.claim}</em>
            </div>
            <button className="gm-exit" onClick={exit}>
              收艺回坊
            </button>
          </div>

          {result ? (
            <div className={`gm-result ${result.correct ? 'ok' : 'no'}`}>
              <span className="gm-result-medal" aria-hidden>
                {result.correct ? '过' : '习'}
              </span>
              <strong>{result.score} 分</strong>
              <p>{result.summary}</p>
              <div className="gm-result-link">
                本局战绩已计入传承档案：正确率与分主题战绩「{result.topic}」
                {result.correct ? ' · 连对与今日打卡同步更新' : ' · 关窍已收进错题本，可随时复盘'}
              </div>
              <div className="gm-result-actions">
                <button className="gm-btn-primary" onClick={() => play(meta.id)}>
                  再来一局
                </button>
                <button className="gm-btn-ghost" onClick={exit}>
                  换玩别的
                </button>
              </div>
            </div>
          ) : (
            <div key={`${meta.id}-${roundNo}`} className="gm-body">
              {renderGame(meta.id)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
