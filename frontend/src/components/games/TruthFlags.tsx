/**
 * 投令旗辨真伪：八道非遗陈述限时 3.5 秒判"真/伪"，超时按错计。
 * 答对六道及以上达标。题干均取自确证的非遗常识，复盘随错题本留存。
 */
import { useEffect, useMemo, useState } from 'react'
import type { GameProps } from './types'

interface Fact {
  text: string
  truth: boolean
  exp: string
}

const BANK: Fact[] = [
  { text: '昆曲在 2001 年入选联合国教科文组织首批"人类口述和非物质遗产代表作"。', truth: true, exp: '昆曲是百戏之祖，2001 年成为首批 19 项代表作之一。' },
  { text: '古琴艺术于 2003 年入选人类非物质文化遗产代表作名录。', truth: true, exp: '古琴艺术 2003 年入选，2006 年列入第一批国家级非遗名录。' },
  { text: '剪纸只能用剪刀完成，凡使用刻刀的都不能称为剪纸。', truth: false, exp: '剪纸分"剪"与"刻"两路，刻纸以刻刀在蜡盘上镂刻，同属剪纸技艺。' },
  { text: '"永字八法"概括了汉字八种基本笔画的写法。', truth: true, exp: '侧、勒、弩、趯、策、掠、啄、磔，以"永"字八字概括楷法笔意。' },
  { text: '古琴有九根弦，所以又称"九弦琴"。', truth: false, exp: '古琴七弦，又称七弦琴，最常见的制式为仲尼式、伏羲式。' },
  { text: '端午节于 2009 年入选人类非物质文化遗产代表作名录。', truth: true, exp: '中国端午节 2009 年入选，是中国首个入选的传统节日。' },
  { text: '京剧脸谱中红色多象征忠勇，白色多象征奸诈。', truth: true, exp: '红表忠勇如关羽，白表奸诈如曹操，色彩本身就是"角儿的说明书"。' },
  { text: '唐三彩是高温烧成的瓷器。', truth: false, exp: '唐三彩是低温铅釉陶器，以黄、绿、白三色为主，属陶而非瓷。' },
  { text: '"文房四宝"指的是琴、棋、书、画。', truth: false, exp: '文房四宝是笔、墨、纸、湖笔徽墨宣纸端砚为其代表。' },
  { text: '端午节是为纪念李白而流传至今的。', truth: false, exp: '端午纪念屈原说流传最广，亦有伍子胥、曹娥等地方传说。' },
  { text: '苏绣、湘绣、粤绣、蜀绣并称中国四大名绣。', truth: true, exp: '四大名绣各具针法与题材：苏绣精细、湘绣写实、粤绣富丽、蜀绣明快。' },
  { text: '宣纸产自安徽泾县，是书画与古籍修复的重要载体。', truth: true, exp: '宣纸产自泾县古属宣州，青檀皮与沙田稻草为主要原料，墨韵千年。' },
  { text: '二十四节气于 2016 年入选人类非物质文化遗产代表作名录。', truth: true, exp: '"二十四节气——中国人通过观察太阳周年运动而形成的时间知识体系"2016 年入选。' },
  { text: '京剧是中国现存最古老的戏曲剧种。', truth: false, exp: '昆曲发源更早（元末明初），被称为百戏之祖；京剧形成于清代徽班进京之后。' },
  { text: '景德镇手工制瓷技艺中，青花是以钴料在坯上绘画、罩透明釉一次烧成。', truth: true, exp: '青花瓷属釉下彩，高温一次烧成，釉色蓝白相映。' },
  { text: '皮影戏的影人一般以驴皮、牛皮等兽皮镂刻着色而成。', truth: true, exp: '皮影经选皮、制皮、画稿、镂刻、敷彩、熨平等二十余道工序制成。' },
]

const TOTAL = 8
const LIMIT = 3500
const PASS = 6

export default function TruthFlags({ onFinish }: GameProps) {
  const quiz = useMemo(
    () => [...BANK].sort(() => Math.random() - 0.5).slice(0, TOTAL),
    [],
  )
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [wrongFact, setWrongFact] = useState<Fact | null>(null)

  useEffect(() => {
    if (picked !== null || idx >= TOTAL) return
    const timer = window.setTimeout(() => answer(null), LIMIT)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, picked])

  function answer(truth: boolean | null) {
    if (picked !== null) return
    setPicked(truth)
    const fact = quiz[idx]
    const ok = truth === fact.truth
    if (ok) {
      setScore((s) => s + 1)
    } else if (!wrongFact) {
      setWrongFact(fact)
    }
    window.setTimeout(() => {
      if (idx + 1 >= TOTAL) {
        const finalScore = score + (ok ? 1 : 0)
        const correct = finalScore >= PASS
        // 复盘题取本局第一道失手的陈述，没有则不写错题
        const wf = !ok ? fact : wrongFact
        onFinish({
          topic: '游艺 · 投令旗',
          correct,
          score: Math.round((finalScore / TOTAL) * 100),
          summary: correct
            ? `八令中 ${finalScore}，见闻扎实`
            : `八令中 ${finalScore}，再读几卷名册（${PASS} 中即过）`,
          wrong:
            correct || !wf
              ? undefined
              : {
                  q: `投令旗：${wf.text}`,
                  answer: wf.truth ? '此说为真' : '此说为伪',
                  exp: wf.exp,
                },
        })
        return
      }
      setIdx((i) => i + 1)
      setPicked(null)
    }, 720)
  }

  const fact = quiz[idx]

  return (
    <div className="gm-tf">
      <div className="gm-bar">
        <span>
          第 {Math.min(idx + 1, TOTAL)} / {TOTAL} 令
        </span>
        <i>
          {Array.from({ length: TOTAL }, (_, i) => (
            <b key={i} className={i < score ? 'on' : ''} />
          ))}
        </i>
      </div>
      <div className="gm-tf-card" key={idx}>
        <p className="gm-tf-text">{fact.text}</p>
        <div className="gm-tf-timer">
          <i
            className={picked !== null ? 'stop' : ''}
            style={{ animationDuration: `${LIMIT}ms` }}
          />
        </div>
        <div className="gm-tf-actions">
          <button
            className={`gm-tf-btn true${picked === true ? ' pick' : ''}${
              picked !== null && fact.truth ? ' show' : ''
            }`}
            onClick={() => answer(true)}
            disabled={picked !== null}
          >
            真有此事
          </button>
          <button
            className={`gm-tf-btn false${picked === false ? ' pick' : ''}${
              picked !== null && !fact.truth ? ' show' : ''
            }`}
            onClick={() => answer(false)}
            disabled={picked !== null}
          >
            令出有疑
          </button>
        </div>
        {picked !== null && (
          <p className={`gm-tf-exp ${picked === fact.truth ? 'ok' : 'no'}`}>
            {picked === fact.truth ? '判得准' : `${fact.truth ? '实为真' : '实为伪'} · ${fact.exp}`}
          </p>
        )}
      </div>
    </div>
  )
}
