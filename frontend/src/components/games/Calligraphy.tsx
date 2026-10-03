/**
 * 书法临帖：米字格中浅印范字，指针运笔描摹，按范字网格覆盖率与溢出率评分。
 * 离屏 canvas 同字号绘制范字取 alpha 网格做评分基准；墨色随双主题读取 CSS 变量。
 */
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../../utils/theme'
import type { GameProps } from './types'

const SIZE = 320
const GRID = 16
const CELL = SIZE / GRID
const FONT = '700 230px "Noto Serif SC","Songti SC","STSong",serif'
const CHARS = ['永', '和', '福', '寿', '茶', '静', '道', '禅']

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#f5f1e8'
}

export default function Calligraphy({ onFinish }: GameProps) {
  const theme = useTheme()
  const charRef = useRef(CHARS[Math.floor(Math.random() * CHARS.length)])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)
  const [scored, setScored] = useState<number | null>(null)
  const [hint, setHint] = useState('')

  // 墨色随主题：暗墨题用浅纸色，亮纸题用墨色
  useEffect(() => {
    clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  function ctx2d() {
    return canvasRef.current?.getContext('2d') ?? null
  }

  function clear() {
    const ctx = ctx2d()
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    setScored(null)
    setHint('')
  }

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    }
  }

  function down(e: React.PointerEvent) {
    if (scored !== null) return
    const ctx = ctx2d()
    if (!ctx) return
    drawing.current = true
    canvasRef.current!.setPointerCapture(e.pointerId)
    lastPt.current = pos(e)
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current || scored !== null) return
    const ctx = ctx2d()
    if (!ctx || !lastPt.current) return
    const p = pos(e)
    ctx.strokeStyle = cssVar('--paper')
    ctx.lineWidth = 15
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPt.current = p
  }

  function up() {
    drawing.current = false
    lastPt.current = null
  }

  /** 离屏范字网格 alpha */
  function modelGrid(): Uint8Array {
    const off = document.createElement('canvas')
    off.width = SIZE
    off.height = SIZE
    const c = off.getContext('2d')!
    c.fillStyle = '#000'
    c.font = FONT
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(charRef.current, SIZE / 2, SIZE / 2 + 12)
    const data = c.getImageData(0, 0, SIZE, SIZE).data
    const grid = new Uint8Array(GRID * GRID)
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        let hit = 0
        for (let y = gy * CELL; y < (gy + 1) * CELL; y += 4) {
          for (let x = gx * CELL; x < (gx + 1) * CELL; x += 4) {
            if (data[(y * SIZE + x) * 4 + 3] > 60) hit++
          }
        }
        grid[gy * GRID + gx] = hit > 2 ? 1 : 0
      }
    }
    return grid
  }

  function judge() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const ink = ctx.getImageData(0, 0, SIZE, SIZE).data
    const written = new Uint8Array(GRID * GRID)
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        let hit = 0
        for (let y = gy * CELL; y < (gy + 1) * CELL; y += 4) {
          for (let x = gx * CELL; x < (gx + 1) * CELL; x += 4) {
            if (ink[(y * SIZE + x) * 4 + 3] > 40) hit++
          }
        }
        written[gy * GRID + gx] = hit > 1 ? 1 : 0
      }
    }
    const model = modelGrid()
    let target = 0
    let covered = 0
    let outside = 0
    let blank = 0
    for (let i = 0; i < model.length; i++) {
      if (model[i]) {
        target++
        if (written[i]) covered++
      } else {
        blank++
        if (written[i]) outside++
      }
    }
    const cover = covered / Math.max(1, target)
    const over = outside / Math.max(1, blank)
    if (covered < 10) {
      setHint('墨迹尚浅，先对着范字描上几笔')
      return
    }
    const score = Math.max(0, Math.min(100, Math.round(cover * 100 - over * 30)))
    setScored(score)
    const correct = score >= 65
    onFinish({
      topic: '游艺 · 书法临帖',
      correct,
      score,
      summary: correct ? `临帖 ${score} 分，笔意已得几分神似` : `临帖 ${score} 分，再临一遍找找笔锋（65 分过）`,
      wrong: correct
        ? undefined
        : {
            q: `书法临帖：临摹「${charRef.current}」字时，如何判断自己写得到不到位？`,
            answer: '对照范字的笔画位置与间架结构，看覆盖率与是否溢出米字格',
            exp: '临帖先求形似：起收笔位置对、笔画不偏离格线，再追求提按转折的笔意；米字格正是用来校准间架的。',
          },
    })
  }

  return (
    <div className="gm-cl">
      <p className="gm-tip">
        临「{charRef.current}」帖：顺着浅印范字运笔，覆盖率高、不溢格者为优
      </p>
      <div className="gm-cl-grid">
        <span className="gm-cl-char" aria-hidden>
          {charRef.current}
        </span>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="gm-cl-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <div className="gm-cl-actions">
        <button className="gm-btn-ghost" onClick={clear} disabled={scored !== null}>
          重新蘸墨
        </button>
        <button className="gm-btn-primary" onClick={judge} disabled={scored !== null}>
          交卷评帖
        </button>
      </div>
      {scored !== null && <p className="gm-cl-score">{scored} 分</p>}
      {hint && <p className="gm-cl-hint">{hint}</p>}
    </div>
  )
}
