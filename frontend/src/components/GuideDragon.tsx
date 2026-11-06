/** 新手指引 · 游龙入画
 * 龙形采用所给画稿（已抠去薄荷底色），置于介绍卡片下方，
 * 以低频湍流位移做持续蠕动，另有缓慢浮游，静立亦有游龙的呼吸感。
 * 每站转场复用同一龙形穿屏而过，三种飞法轮换，前后翻页方向可逆。
 */
const DRAGON = '/guide/dragon-mural.png'

/** 游龙蠕动：低频湍流缓慢推移，鳞身随波蜿蜒 */
function DragonWarpDefs() {
  return (
    <svg className="gd-warp-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <filter id="gd-warp" x="-6%" y="-10%" width="112%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.009"
            numOctaves="1"
            seed="3"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="14s"
              values="0.004 0.008;0.0065 0.0125;0.004 0.008"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="7"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

export default function GuideDragon() {
  return (
    <div className="guide-dragon" aria-hidden="true">
      <DragonWarpDefs />
      <img className="gd-img" src={DRAGON} alt="" draggable={false} />
    </div>
  )
}

/** 每站转场：游龙穿屏而过，一页换景；上一页反向回溯 */
export function GuideDragonFlight({ variant, dir }: { variant: number; dir: 1 | -1 }) {
  return (
    <div className={`guide-flight v${variant % 3}${dir < 0 ? ' is-back' : ''}`} aria-hidden="true">
      <div className="df-inner">
        <span className="df-mist" />
        <img className="df-art" src={DRAGON} alt="" draggable={false} />
      </div>
    </div>
  )
}
