/**
 * 剪纸补花：红纸对折，左半已下剪，选出与之严格对称的右半。
 * 图案由图元（圆/花瓣/菱花）程序生成；正解为水平镜像，干扰项做错位/缺失/变形。
 * 五轮三选一，答对 4 轮及以上达标。
 */
import { useState } from 'react'
import type { GameProps } from './types'

type Shape = {
  k: 'c' | 'e' | 'd'
  x: number
  y: number
  s: number
  rot: number
}

const ROUNDS = 5
const PASS = 4

function rand(n: number) {
  return Math.floor(Math.random() * n)
}

/** 在左半幅（x 20-48）随机布一组图元 */
function genItems(): Shape[] {
  const n = 4 + rand(3)
  const ks: Shape['k'][] = ['c', 'e', 'd']
  return Array.from({ length: n }, () => ({
    k: ks[rand(3)],
    x: 18 + rand(31),
    y: 16 + rand(68),
    s: 5 + rand(7),
    rot: rand(4) * 45,
  }))
}

function perturb(items: Shape[]): Shape[] {
  const out = items.map((it) => ({ ...it }))
  const mode = rand(3)
  const i = rand(out.length)
  if (mode === 0) {
    out[i].x = Math.min(48, Math.max(16, out[i].x + 7 + rand(8)))
  } else if (mode === 1 && out.length > 3) {
    out.splice(i, 1)
  } else {
    out[i].s = Math.max(3, out[i].s * (rand(2) ? 1.5 : 0.6))
  }
  return out
}

function ShapeNode({ it }: { it: Shape }) {
  if (it.k === 'c') return <circle cx={it.x} cy={it.y} r={it.s} />
  if (it.k === 'e')
    return <ellipse cx={it.x} cy={it.y} rx={it.s} ry={it.s * 0.56} transform={`rotate(${it.rot} ${it.x} ${it.y})`} />
  return (
    <path
      d={`M${it.x} ${it.y - it.s} L${it.x + it.s * 0.72} ${it.y} L${it.x} ${it.y + it.s} L${it.x - it.s * 0.72} ${it.y} Z`}
      transform={`rotate(${it.rot} ${it.x} ${it.y})`}
    />
  )
}

/** 半幅纹样：mirror 时绘制镜像的右半 */
function Half({ items, mirror }: { items: Shape[]; mirror: boolean }) {
  return (
    <g transform={mirror ? 'translate(100,0) scale(-1,1)' : undefined} fill="currentColor">
      {items.map((it, i) => (
        <ShapeNode key={i} it={it} />
      ))}
    </g>
  )
}

interface Choice {
  items: Shape[]
  right: boolean
}

interface Puzzle {
  left: Shape[]
  choices: Choice[]
}

const sameShape = (a: Shape[], b: Shape[]) =>
  a.length === b.length &&
  a.every((it, i) => it.x === b[i].x && it.y === b[i].y && it.s === b[i].s && it.rot === b[i].rot)

function makePuzzle(): Puzzle {
  const left = genItems()
  let wrong1 = perturb(left)
  let wrong2 = perturb(left)
  let guard = 0
  while ((sameShape(wrong1, left) || sameShape(wrong2, left) || sameShape(wrong1, wrong2)) && guard < 12) {
    wrong1 = perturb(left)
    wrong2 = perturb(left)
    guard++
  }
  const choices: Choice[] = [
    { items: left, right: true },
    { items: wrong1, right: false },
    { items: wrong2, right: false },
  ].sort(() => Math.random() - 0.5)
  return { left, choices }
}

export default function PaperCut({ onFinish }: GameProps) {
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [hits, setHits] = useState(0)
  const [data, setData] = useState<Puzzle>(makePuzzle)

  function choose(i: number) {
    if (picked !== null) return
    setPicked(i)
    const ok = data.choices[i].right
    const nh = hits + (ok ? 1 : 0)
    window.setTimeout(() => {
      if (round + 1 >= ROUNDS) {
        const correct = nh >= PASS
        onFinish({
          topic: '游艺 · 剪纸补花',
          correct,
          score: Math.round((nh / ROUNDS) * 100),
          summary: correct ? `五剪 ${nh} 中，窗花严丝合缝` : `五剪 ${nh} 中，差些火候（满 ${PASS} 中即过）`,
          wrong: correct
            ? undefined
            : {
                q: '剪纸补花：折叠对称的纹样，展开后两半应当是什么关系？',
                answer: '以折痕为轴完全重合（镜像对称）',
                exp: '剪纸常将纸对折后下剪，展开即得轴对称团花；半幅上每个镂空点，在另一半都有关于折痕等距的对应点。',
              },
        })
        return
      }
      setHits(nh)
      setRound((r) => r + 1)
      setPicked(null)
      setData(makePuzzle())
    }, 850)
  }

  return (
    <div className="gm-pc">
      <div className="gm-bar">
        <span>
          第 {Math.min(round + 1, ROUNDS)} / {ROUNDS} 剪
        </span>
        <i>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <b key={i} className={i < hits ? 'on' : ''} />
          ))}
        </i>
      </div>
      <p className="gm-tip">红纸已对折下剪，哪一张才是左半纹样严丝合缝的另一半？</p>
      <div className="gm-pc-stage">
        <div className="gm-pc-paper gm-pc-half">
          <svg viewBox="0 0 100 100" aria-hidden>
            <line x1="50" y1="4" x2="50" y2="96" className="gm-pc-fold" />
            <Half items={data.left} mirror={false} />
          </svg>
          <em>折痕</em>
        </div>
        <div className="gm-pc-choices">
          {data.choices.map((c, i) => {
            const state =
              picked === null ? '' : c.right ? ' is-right' : picked === i ? ' is-wrong' : ' is-dim'
            return (
              <button
                key={i}
                className={`gm-pc-paper gm-pc-opt${state}`}
                onClick={() => choose(i)}
                disabled={picked !== null}
                aria-label={`候选右半 ${i + 1}`}
              >
                <svg viewBox="0 0 100 100" aria-hidden>
                  <line x1="50" y1="4" x2="50" y2="96" className="gm-pc-fold" />
                  <Half items={c.items} mirror />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
