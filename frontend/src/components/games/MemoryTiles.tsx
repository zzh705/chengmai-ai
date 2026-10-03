/**
 * 纹样翻牌：五对非遗符号（团花 / 永字 / 古琴 / 折扇 / 宫灯），翻牌配对。
 * 10 张牌 5 对；步数不超过 13 即达标，9 步以内为上乘。
 */
import { useMemo, useState } from 'react'
import type { GameProps } from './types'

type IconKind = 'flower' | 'yong' | 'qin' | 'fan' | 'lantern'

function MotifIcon({ kind }: { kind: IconKind }) {
  const common = {
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'flower':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="4" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx="24"
              cy="13"
              rx="3.4"
              ry="7"
              transform={`rotate(${a} 24 24)`}
            />
          ))}
        </svg>
      )
    case 'yong':
      return (
        <svg {...common}>
          <path d="M24 10v28M14 18h20M14 18c-2 6 4 10 10 12M24 30c5 3 8 6 8 10M14 36h20" />
        </svg>
      )
    case 'qin':
      return (
        <svg {...common}>
          <path d="M10 16h28l-3 18H13z" />
          <path d="M14 16v18M20 16v18M26 16v18M32 16v18M10 20h28" />
          <circle cx="24" cy="12" r="2.4" />
        </svg>
      )
    case 'fan':
      return (
        <svg {...common}>
          <path d="M24 38 9 22a18 18 0 0 1 30 0Z" />
          <path d="M24 38V22M24 38 15.5 27M24 38l8.5-11M14.5 19.5 24 22M33.5 19.5 24 22" />
        </svg>
      )
    case 'lantern':
      return (
        <svg {...common}>
          <path d="M18 8h12M20 8v4M28 8v4" />
          <rect x="14" y="14" width="20" height="20" rx="9" />
          <path d="M24 14v20M18 14c-2 5-2 15 0 20M30 14c2 5 2 15 0 20" />
          <path d="M21 38h6M24 38v4" />
        </svg>
      )
  }
}

interface Tile {
  id: number
  kind: IconKind
  flipped: boolean
  matched: boolean
}

const KINDS: IconKind[] = ['flower', 'yong', 'qin', 'fan', 'lantern']
const PASS_STEPS = 13

export default function MemoryTiles({ onFinish }: GameProps) {
  const [tiles, setTiles] = useState<Tile[]>(deal)
  const [open, setOpen] = useState<number[]>([])
  const [steps, setSteps] = useState(0)
  const [lock, setLock] = useState(false)
  const done = useMemo(() => tiles.every((t) => t.matched), [tiles])

  function deal(): Tile[] {
    return [...KINDS, ...KINDS]
      .map((kind, i) => ({ id: i, kind, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5)
      .map((t, i) => ({ ...t, id: i }))
  }

  function flip(idx: number) {
    if (lock || done) return
    const t = tiles[idx]
    if (t.flipped || t.matched) return
    const nextTiles = tiles.map((x, i) => (i === idx ? { ...x, flipped: true } : x))
    const nextOpen = [...open, idx]
    setTiles(nextTiles)
    setOpen(nextOpen)
    if (nextOpen.length === 2) {
      const ns = steps + 1
      setSteps(ns)
      setLock(true)
      const [a, b] = nextOpen
      if (nextTiles[a].kind === nextTiles[b].kind) {
        window.setTimeout(() => {
          const paired = nextTiles.map((x, i) =>
            i === a || i === b ? { ...x, matched: true } : x,
          )
          setTiles(paired)
          setOpen([])
          setLock(false)
          if (paired.every((x) => x.matched)) finish(ns)
        }, 420)
      } else {
        window.setTimeout(() => {
          setTiles((cur) =>
            cur.map((x, i) => (i === a || i === b ? { ...x, flipped: false } : x)),
          )
          setOpen([])
          setLock(false)
        }, 760)
      }
    }
  }

  function finish(finalSteps: number) {
    const correct = finalSteps <= PASS_STEPS
    const score = Math.max(40, Math.min(100, Math.round(100 - (finalSteps - 5) * 7)))
    onFinish({
      topic: '游艺 · 纹样翻牌',
      correct,
      score,
      summary:
        finalSteps <= 9
          ? `${finalSteps} 步配对五组纹样，眼力上佳`
          : correct
            ? `${finalSteps} 步配对五组纹样（${PASS_STEPS} 步内过）`
            : `${finalSteps} 步才配对，记住位置再来一局（${PASS_STEPS} 步内过）`,
      wrong: correct
        ? undefined
        : {
            q: '纹样翻牌：怎样才能用更少步数完成配对？',
            answer: '先短时记住翻过纹样的位置，再集中寻找配对',
            exp: '记忆配对练的是"位置记忆"：每张牌翻回后仍在原位，记住团花、永字、古琴等符号各自的方位，第二轮即可成竹在胸。',
          },
    })
  }

  function restart() {
    setTiles(deal())
    setOpen([])
    setSteps(0)
    setLock(false)
  }

  return (
    <div className="gm-mem">
      <div className="gm-bar">
        <span>{done ? '五组纹样已配对' : '翻出相同纹样即配对'}</span>
        <i className="gm-mem-steps">步数 {steps}</i>
      </div>
      <div className={`gm-mem-grid${done ? ' is-done' : ''}`}>
        {tiles.map((t, i) => (
          <button
            key={t.id}
            className={`gm-mem-tile ${t.flipped || t.matched ? 'up' : ''} ${t.matched ? 'paired' : ''}`}
            onClick={() => flip(i)}
            aria-label={t.flipped || t.matched ? '纹样牌面' : '未翻开的牌'}
          >
            <span className="gm-mem-back" aria-hidden />
            <span className="gm-mem-face" aria-hidden>
              <MotifIcon kind={t.kind} />
            </span>
          </button>
        ))}
      </div>
      {done && (
        <button className="gm-btn-ghost" onClick={restart}>
          再摆一局
        </button>
      )}
    </div>
  )
}
