/** 新手指引 · 游龙入画
 * 龙形不再手绘描线，直接采用所给画稿（已抠去薄荷底色），
 * 作为一大幅画心铺在页面右侧，融入指引页的夜色背景。
 * 同一张画稿也用作每站转场的穿屏游龙，前后翻页方向可逆。
 */
const DRAGON = '/guide/dragon-mural.png'

export default function GuideDragon() {
  return (
    <div className="guide-dragon" aria-hidden="true">
      <img src={DRAGON} alt="" draggable={false} />
    </div>
  )
}

/** 每站转场：游龙穿屏而过，一页换景；上一页反向回溯 */
export function GuideDragonFlight({ variant, dir }: { variant: number; dir: 1 | -1 }) {
  return (
    <div className={`guide-flight v${variant % 3}${dir < 0 ? ' is-back' : ''}`} aria-hidden="true">
      <div className="df-inner">
        <img className="df-art" src={DRAGON} alt="" draggable={false} />
      </div>
    </div>
  )
}
