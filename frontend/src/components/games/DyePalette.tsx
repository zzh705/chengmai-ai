/**
 * 点色成画：为潍坊沙燕风筝的双翅、胸腹、剪尾施传统矿彩。
 * 参照沙燕"红翅青腹黄剪尾"的典型配色：染对两处即达标，并附配色讲究。
 */
import { useState } from 'react'
import type { GameProps } from './types'

type Part = 'wings' | 'breast' | 'tail'

const PARTS: { id: Part; name: string }[] = [
  { id: 'wings', name: '双翅' },
  { id: 'breast', name: '胸腹' },
  { id: 'tail', name: '剪尾' },
]

const COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'zhu', name: '朱砂', hex: '#c0402e' },
  { id: 'teng', name: '藤黄', hex: '#e0a82e' },
  { id: 'qing', name: '石青', hex: '#3a6ea5' },
  { id: 'lv', name: '松绿', hex: '#4f8f7b' },
  { id: 'zhe', name: '赭石', hex: '#a86e38' },
  { id: 'mo', name: '墨青', hex: '#333c44' },
]

// 沙燕传统正解
const ANSWER: Record<Part, string> = { wings: 'zhu', breast: 'qing', tail: 'teng' }
const WHY: Record<Part, string> = {
  wings: '沙燕双翅多取朱砂大红，喜庆而醒目，天际远放依然清楚',
  breast: '胸腹喜用石青衬底，与红翅形成"青朱相映"的沉稳对比',
  tail: '剪尾点藤黄，红黄相随如穗带飘举，全筝色彩由此收束',
}

export default function DyePalette({ onFinish }: GameProps) {
  const [dyed, setDyed] = useState<Record<Part, string | null>>({
    wings: null,
    breast: null,
    tail: null,
  })
  const [sel, setSel] = useState<Part>('wings')
  const [submitted, setSubmitted] = useState(false)

  const filled = PARTS.filter((p) => dyed[p.id]).length

  function dye(colorId: string) {
    if (submitted) return
    setDyed((d) => ({ ...d, [sel]: colorId }))
  }

  function submit() {
    if (filled < 3 || submitted) return
    const right = PARTS.filter((p) => dyed[p.id] === ANSWER[p.id]).length
    setSubmitted(true)
    const score = Math.round((right / 3) * 100)
    const correct = right >= 2
    onFinish({
      topic: '游艺 · 点色成画',
      correct,
      score,
      summary:
        right === 3
          ? '朱砂红翅、石青绘腹、藤黄收尾，尽得沙燕真传'
          : correct
            ? `三染中 ${right}，已近沙燕正脉（中两处即过）`
            : `三染中 ${right}，传统配色另有讲究（中两处即过）`,
      wrong:
        correct
          ? undefined
          : {
              q: '点色成画：潍坊沙燕风筝双翅、胸腹、剪尾的典型配色是什么？',
              answer: '双翅朱砂、胸腹石青、剪尾藤黄',
              exp: '红翅青腹黄剪尾：朱砂醒目宜远观，石青沉稳压阵，藤黄收束提亮，三色构成沙燕百年典型配色。',
            },
    })
  }

  function restart() {
    setDyed({ wings: null, breast: null, tail: null })
    setSel('wings')
    setSubmitted(false)
  }

  const fill = (p: Part) => COLORS.find((c) => c.id === dyed[p])?.hex ?? 'transparent'

  return (
    <div className="gm-dye">
      <p className="gm-tip">先点选部位，再蘸矿彩上色；三染齐备后呈染品评</p>
      <div className="gm-dye-layout">
        <svg className="gm-dye-kite" viewBox="0 0 200 180" aria-label="沙燕风筝白描">
          {/* 双翅 */}
          <path
            d="M100 62 C62 36 16 46 8 76 C32 74 58 84 100 96 Z"
            fill={fill('wings')}
            className={sel === 'wings' ? 'sel' : ''}
            onClick={() => setSel('wings')}
          />
          <path
            d="M100 62 C138 36 184 46 192 76 C168 74 142 84 100 96 Z"
            fill={fill('wings')}
            className={sel === 'wings' ? 'sel' : ''}
            onClick={() => setSel('wings')}
          />
          {/* 胸腹 */}
          <path
            d="M100 44 C79 66 79 118 100 140 C121 118 121 66 100 44 Z"
            fill={fill('breast')}
            className={sel === 'breast' ? 'sel' : ''}
            onClick={() => setSel('breast')}
          />
          {/* 头与眼 */}
          <circle
            cx="100"
            cy="36"
            r="13"
            fill={fill('breast')}
            className={sel === 'breast' ? 'sel' : ''}
            onClick={() => setSel('breast')}
          />
          <circle cx="95.5" cy="34" r="2.4" className="gm-dye-eye" />
          <circle cx="104.5" cy="34" r="2.4" className="gm-dye-eye" />
          {/* 剪尾 */}
          <path
            d="M89 136 L68 168 L93 156 Z"
            fill={fill('tail')}
            className={sel === 'tail' ? 'sel' : ''}
            onClick={() => setSel('tail')}
          />
          <path
            d="M111 136 L132 168 L107 156 Z"
            fill={fill('tail')}
            className={sel === 'tail' ? 'sel' : ''}
            onClick={() => setSel('tail')}
          />
        </svg>
        <div className="gm-dye-panel">
          <div className="gm-dye-parts">
            {PARTS.map((p) => (
              <button
                key={p.id}
                className={`gm-dye-part ${sel === p.id ? 'sel' : ''} ${dyed[p.id] ? 'dyed' : ''}`}
                onClick={() => setSel(p.id)}
              >
                <i style={{ background: dyed[p.id] ? COLORS.find((c) => c.id === dyed[p.id])?.hex : 'transparent' }} />
                {p.name}
                {submitted && (
                  <em className={dyed[p.id] === ANSWER[p.id] ? 'ok' : 'no'}>
                    {COLORS.find((c) => c.id === ANSWER[p.id])?.name}
                  </em>
                )}
              </button>
            ))}
          </div>
          <div className="gm-dye-colors">
            {COLORS.map((c) => (
              <button
                key={c.id}
                className="gm-dye-dot"
                title={c.name}
                aria-label={`蘸${c.name}色`}
                onClick={() => dye(c.id)}
              >
                <i style={{ background: c.hex }} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
          {!submitted ? (
            <button className="gm-btn-primary" onClick={submit} disabled={filled < 3}>
              {filled < 3 ? `还差 ${3 - filled} 处染色` : '呈染品评'}
            </button>
          ) : (
            <button className="gm-btn-ghost" onClick={restart}>
              重染一只
            </button>
          )}
          {submitted && <p className="gm-dye-why">{WHY[sel]}</p>}
        </div>
      </div>
    </div>
  )
}
