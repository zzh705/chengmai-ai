import '../styles/guideTransit.css'

/** 十一站的换站动画：一页换景，一物点题
 * 每站一个主意象（卷 / 墨 / 书 / 丝 / 舆 / 星 / 山 / 枝 / 锋 / 印 / 脉），
 * 淡墨底子 + 中央一字点睛，0.95 秒来去，柔而不抢内容。 */
const GLYPHS = ['启', '问', '读', '谱', '图', '星', '山', '枝', '题', '印', '脉']

export default function GuideTransit({ stepIdx, dir }: { stepIdx: number; dir: 1 | -1 }) {
  const i = Math.min(GLYPHS.length - 1, Math.max(0, stepIdx))
  return (
    <div className={`guide-transit k${i}${dir < 0 ? ' is-back' : ''}`} aria-hidden="true">
      <span className="gt-wash" />
      <span className="gt-glyph">{GLYPHS[i]}</span>
      <span className="gt-stage">
        <i className="gt-1" />
        <i className="gt-2" />
        <i className="gt-3" />
      </span>
    </div>
  )
}
