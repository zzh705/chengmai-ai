import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import '../styles/motif.css'

/**
 * 中华剪影（Motif）：在内容列两侧留白处立一页「水墨影戏」。
 * 六种图案各页不同，杜绝审美疲劳：
 *  opera    水袖舞人（活化实验室） bamboo  墨竹（承脉 AI，色随问答模式流转）
 *  steps    书山卷阶（学习路径）   banner  令旗飘幡（非遗挑战）
 *  mountain 远岭飞鹤（非遗知识库） lattice 冰梅窗棂（传承档案）
 *
 * 出场：毛笔逐笔描边（stroke-dashoffset  stagger 落笔），墨色随后晕开，
 *       整幅自纸下轻轻浮起，不呆立。
 * 呼吸：各页专属微动（袖扬/竹摇/星吐/旗扬/鹤游/梅落），只动 transform/opacity。
 * 随行：页面滚动时剪影以不同速率缓缓跟移（左慢右略快），如远山随人。
 * 交互：指针近侧视差吐纳；点击本体回一式并迸出几粒对应符号。
 * 纯装饰：aria-hidden，窄屏隐去，prefers-reduced-motion 全静态。
 */

export type MotifKind = 'opera' | 'bamboo' | 'steps' | 'banner' | 'mountain' | 'lattice'

/** 入场节拍：--d 为落笔时刻，--o 为墨色终值 */
const v = (d: string, o?: number): CSSProperties =>
  ({ '--d': d, ...(o !== undefined ? { '--o': o } : {}) }) as CSSProperties

/* ---- 六组写意 SVG，均以 200×560 竖向取景，currentColor 由 CSS 给色 ---- */

const OPERA = (
  <>
    {/* 台底雾气 */}
    <ellipse className="mf-ink" cx="100" cy="505" rx="94" ry="24" style={v('1.05s', 0.4)} />
    {/* 头与发髻 */}
    <circle className="mf-ink" cx="106" cy="116" r="20" style={v('0.5s', 0.92)} />
    <path
      className="mf-ink"
      style={v('0.58s', 0.92)}
      d="M88 110 C 86 90 98 80 112 84 C 124 88 128 100 122 112 C 112 104 98 104 88 110 Z"
    />
    <circle className="mf-ink" cx="121" cy="90" r="5.5" style={v('0.66s', 0.9)} />
    {/* 身形 */}
    <path
      className="mf-ink"
      style={v('0.6s', 0.9)}
      d="M108 150 C 92 196 88 250 96 310 C 100 342 94 372 84 404 C 78 424 80 446 88 462 L 132 462 C 140 442 140 420 132 398 C 122 368 120 338 126 306 C 134 250 128 196 108 150 Z"
    />
    {/* 腰间绦带 */}
    <path
      className="mf-draw"
      style={v('0.74s')}
      pathLength={1}
      d="M95 308 C 106 317 122 317 133 306"
      fill="none"
      strokeWidth="4"
      strokeLinecap="round"
    />
    {/* 双袖：最后落笔，最长两笔 */}
    <g className="mf-idle mf-idle-sleeve-l">
      <path
        className="mf-draw mf-ribbon"
        style={v('0.08s')}
        pathLength={1}
        d="M108 168 C 60 196 26 250 24 320 C 22 372 46 408 38 452 C 34 476 20 492 14 512"
        fill="none"
        strokeWidth="15"
        strokeLinecap="round"
      />
    </g>
    <g className="mf-idle mf-idle-sleeve-r">
      <path
        className="mf-draw mf-ribbon"
        style={v('0.28s')}
        pathLength={1}
        d="M120 176 C 162 206 186 258 182 316 C 179 356 158 380 168 414 C 173 434 186 446 194 464"
        fill="none"
        strokeWidth="13"
        strokeLinecap="round"
      />
    </g>
  </>
)

const BAMBOO = (
  <g className="mf-idle mf-idle-sway">
    {/* 老竿 */}
    <path
      className="mf-draw"
      style={v('0.05s')}
      pathLength={1}
      d="M74 556 C 76 420 80 240 92 66"
      fill="none"
      strokeWidth="8"
      strokeLinecap="round"
    />
    {/* 幼竿 */}
    <path
      className="mf-draw mf-faint"
      style={v('0.22s')}
      pathLength={1}
      d="M120 556 C 118 470 120 400 130 316"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* 竹节 */}
    {[
      [75, 478],
      [78, 396],
      [81, 314],
      [84, 232],
      [87, 150],
    ].map(([x, y], i) => (
      <path
        key={y}
        className="mf-draw"
        style={v(`${0.34 + i * 0.07}s`)}
        pathLength={1}
        d={`M${x} ${y} l 18 -5`}
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    ))}
    {/* 叶组：浓、中、淡三色 */}
    {[
      { x: 92, y: 118, s: 1, o: 0.9 },
      { x: 84, y: 198, s: -1, o: 0.55 },
      { x: 90, y: 284, s: 1, o: 0.85 },
      { x: 82, y: 366, s: -1, o: 0.45 },
      { x: 128, y: 322, s: 1, o: 0.65 },
    ].map((L, i) => (
      <g key={i} transform={`translate(${L.x} ${L.y}) scale(${L.s} 1)`}>
        <path
          className="mf-ink"
          style={v(`${0.6 + i * 0.1}s`, L.o)}
          d="M0 0 C 16 -15 38 -18 54 -8 C 40 2 16 5 0 0 Z"
        />
        <path
          className="mf-ink"
          style={v(`${0.68 + i * 0.1}s`, L.o * 0.7)}
          d="M0 3 C 14 12 30 22 40 38 C 24 30 8 18 0 8 Z"
        />
      </g>
    ))}
  </g>
)

/* 书山卷阶：半展卷轴为基，之字石阶拾级而上，阶顶一点星芒。
   寓意「书山有路」：路径是一步一步走出来的，与知识库的远山飞鹤拉开意象。 */
const STEPS = (
  <>
    {/* 底部展开的卷轴：书山自卷中展开 */}
    <path
      className="mf-draw"
      style={v('0.05s')}
      pathLength={1}
      d="M30 512 H170"
      fill="none"
      strokeWidth={5}
      strokeLinecap="round"
    />
    <circle className="mf-ink" style={v('0.12s', 0.82)} cx={30} cy={512} r={10} />
    <circle className="mf-ink" style={v('0.18s', 0.82)} cx={170} cy={512} r={10} />
    <path className="mf-ink" style={v('0.22s', 0.16)} d="M40 498 H160 V526 H40 Z" />
    <path
      className="mf-draw mf-faint"
      style={v('0.3s')}
      pathLength={1}
      d="M40 512 H160"
      fill="none"
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {/* 之字石阶：自卷心拾级而上，水平段为踏面、竖段为踢面 */}
    <path
      className="mf-draw"
      style={v('0.38s')}
      pathLength={1}
      d="M100 498 V472 H142 M142 472 V446 H96 M96 446 V420 H140 M140 420 V394 H100 M100 394 V368 H136 M136 368 V342 H106"
      fill="none"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 足迹墨点两颗，错拍轻吐，如前人脚步 */}
    <g className="mf-idle mf-idle-step-dot-a">
      <circle className="mf-ink" style={v('0.86s', 0.78)} cx={70} cy={452} r={2.8} />
    </g>
    <g className="mf-idle mf-idle-step-dot-b">
      <circle className="mf-ink" style={v('0.98s', 0.6)} cx={150} cy={408} r={2.4} />
    </g>
    {/* 阶顶星芒：书山到顶，自有微光 */}
    <g className="mf-idle mf-idle-step-star">
      <path
        className="mf-ink"
        style={v('1.08s', 0.9)}
        d="M121 300 L126 316 L142 321 L126 326 L121 342 L116 326 L100 321 L116 316 Z"
      />
    </g>
  </>
)

const BANNER = (
  <>
    {/* 枪尖与杆顶结 */}
    <path className="mf-ink" style={v('0.05s', 0.85)} d="M58 62 L65 80 L58 89 L51 80 Z" />
    <circle className="mf-ink" cx="58" cy="97" r="5" style={v('0.12s', 0.82)} />
    {/* 两条飘带：自杆顶向屏外舒展，先以淡墨扫出 */}
    <g className="mf-idle mf-idle-tassel">
      <path
        className="mf-draw mf-ribbon"
        style={v('0.3s')}
        pathLength={1}
        d="M56 99 C 30 158 20 228 28 302 C 32 342 22 386 12 430"
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        className="mf-draw mf-faint"
        style={v('0.46s')}
        pathLength={1}
        d="M60 101 C 48 178 50 258 44 338"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
    {/* 幡杆：一笔到底 */}
    <path
      className="mf-draw"
      style={v('0.1s')}
      pathLength={1}
      d="M58 97 L 58 500"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* 令旗：绕杆顶轻扬，旗面朝向内容列 */}
    <g className="mf-idle mf-idle-banner">
      <path
        className="mf-ink"
        style={v('0.55s', 0.15)}
        d="M62 106 L 150 118 L 146 262 L 106 244 L 74 268 L 62 250 Z"
      />
      <path
        className="mf-draw"
        style={v('0.58s')}
        pathLength={1}
        d="M62 106 L 150 118 L 146 262 L 106 244 L 74 268 L 62 250 Z"
        fill="none"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <text
        className="mf-ink"
        style={{ ...v('0.92s', 0.72), fontFamily: 'var(--font-serif)' }}
        x="107"
        y="192"
        textAnchor="middle"
        fontSize="46"
      >
        令
      </text>
    </g>
    {/* 杆座云头 */}
    <path
      className="mf-ink"
      style={v('0.72s', 0.6)}
      d="M38 500 C 47 491 69 491 78 500 C 69 509 47 509 38 500 Z"
    />
  </>
)

const MOUNTAIN = (
  <>
    {/* 天心月 */}
    <circle className="mf-ink" cx="150" cy="118" r="34" style={v('0.85s', 0.1)} />
    <circle className="mf-ink" cx="150" cy="118" r="24" style={v('0.8s', 0.3)} />
    {/* 远山三层，由淡入浓 */}
    <path
      className="mf-ink"
      style={v('0.45s', 0.24)}
      d="M-10 460 C 32 396 72 390 112 428 C 142 458 172 444 210 408 L 210 560 L -10 560 Z"
    />
    <path
      className="mf-ink"
      style={v('0.62s', 0.45)}
      d="M-10 500 C 30 440 70 432 110 470 C 140 498 170 486 210 452 L 210 560 L -10 560 Z"
    />
    <path
      className="mf-ink"
      style={v('0.78s', 0.72)}
      d="M-10 534 C 36 478 78 470 118 506 C 150 534 178 522 210 498 L 210 560 L -10 560 Z"
    />
    {/* 山脚水纹 */}
    <path
      className="mf-draw mf-faint"
      style={v('1s')}
      pathLength={1}
      d="M30 528 C 60 524 90 524 118 528"
      fill="none"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path
      className="mf-draw mf-faint"
      style={v('1.12s')}
      pathLength={1}
      d="M58 544 C 84 541 110 541 134 544"
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* 飞鹤 */}
    <g className="mf-idle mf-idle-crane">
      <g className="mf-crane">
        <path className="mf-ink" style={v('0.3s', 0.95)} d="M128 196 C 104 176 78 172 52 184 C 76 196 100 206 128 208 Z" />
        <path className="mf-ink" style={v('0.38s', 0.95)} d="M134 198 C 162 180 182 172 198 176 C 178 196 158 208 134 210 Z" />
        <path className="mf-ink" style={v('0.44s', 0.9)} d="M128 204 C 120 216 118 228 124 240 C 128 228 134 218 136 208 Z" />
        <circle className="mf-ink" style={v('0.48s', 0.95)} cx="126" cy="192" r="5" />
        <path
          className="mf-draw"
          style={v('0.52s')}
          pathLength={1}
          d="M124 188 L 116 176"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </g>
  </>
)

const LATTICE = (
  <>
    {/* 窗棂外框 */}
    <rect
      className="mf-draw"
      style={v('0.05s')}
      pathLength={1}
      x="42"
      y="92"
      width="116"
      height="292"
      rx="10"
      fill="none"
      strokeWidth="6"
    />
    {/* 冰裂纹 */}
    <g className="mf-faint" strokeWidth="3" fill="none">
      <path className="mf-draw" style={v('0.3s')} pathLength={1} d="M42 196 L 100 238 L 158 196" />
      <path className="mf-draw" style={v('0.42s')} pathLength={1} d="M100 238 L 100 384" />
      <path className="mf-draw" style={v('0.54s')} pathLength={1} d="M42 314 L 100 238 L 158 314" />
      <path className="mf-draw" style={v('0.66s')} pathLength={1} d="M71 92 L 100 238 L 129 92" />
    </g>
    {/* 窗外梅枝 */}
    <path
      className="mf-draw"
      style={v('0.78s')}
      pathLength={1}
      d="M152 478 C 140 428 122 388 98 352"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      className="mf-draw mf-faint"
      style={v('0.9s')}
      pathLength={1}
      d="M120 392 C 98 380 84 384 70 400"
      fill="none"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    {/* 梅花三朵，先后而开 */}
    {[
      [98, 350, 12],
      [68, 400, 9],
      [126, 416, 8],
    ].map(([cx, cy, r], i) => (
      <g key={i} transform={`translate(${cx} ${cy})`}>
        <g className="mf-idle mf-idle-plum" style={v(`${i * 1.1}s`)}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              className="mf-ink mf-plum-petal"
              style={v(`${0.95 + i * 0.14}s`, 0.85)}
              cx={0}
              cy={-r * 0.92}
              r={r * 0.62}
              transform={`rotate(${a})`}
            />
          ))}
          <circle className="mf-ink mf-plum-core" style={v(`${1.06 + i * 0.14}s`, 0.9)} cx={0} cy={0} r={r * 0.34} />
        </g>
      </g>
    ))}
    {/* 一瓣落梅，循环飘坠 */}
    <g className="mf-idle mf-petal-fall">
      <circle className="mf-ink" style={v('1.35s', 0.7)} cx="88" cy="438" r="3.4" />
    </g>
  </>
)

const KIND_SVG: Record<MotifKind, ReactNode> = {
  opera: OPERA,
  bamboo: BAMBOO,
  steps: STEPS,
  banner: BANNER,
  mountain: MOUNTAIN,
  lattice: LATTICE,
}

/** 点击迸出的粒子符号：每页一种，不重样 */
const PARTICLE_CLASS: Record<MotifKind, string> = {
  opera: 'mf-p-diamond',
  bamboo: 'mf-p-leaf',
  steps: 'mf-p-page',
  banner: 'mf-p-seal',
  mountain: 'mf-p-feather',
  lattice: 'mf-p-bloom',
}

/**
 * @param tone 剪影主色覆盖（CSS color）。用于承脉 AI：墨竹随问答模式换色。
 * 颜色过渡由 CSS 接管，调用方只给终值。
 */
export default function Motif({ kind, tone }: { kind: MotifKind; tone?: string }) {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    /** 视差吐纳：指针近左/近右时，剪影轻轻「看向」指针 */
    function onMove(e: PointerEvent) {
      const w = window.innerWidth
      const nx = e.clientX / w // 0~1
      const ny = e.clientY / window.innerHeight
      const nearL = Math.max(0, 0.24 - nx) / 0.24
      const nearR = Math.max(0, nx - 0.76) / 0.24
      const l = layer!.querySelector<HTMLElement>('.mf-side-left')
      const r = layer!.querySelector<HTMLElement>('.mf-side-right')
      if (l) {
        l.style.setProperty('--sx', `${nearL * 10}px`)
        l.style.setProperty('--sy', `${(ny - 0.5) * nearL * 14}px`)
      }
      if (r) {
        r.style.setProperty('--sx', `${-nearR * 10}px`)
        r.style.setProperty('--sy', `${(ny - 0.5) * nearR * 14}px`)
      }
    }

    /**
     * 随行：页面（内部滚动容器）滚动时，剪影以更缓的速率同向跟移，
     * 左慢右略快，如远山人行则移；0.55s 的 transform 过渡自带阻尼。
     */
    function onScroll(e: Event) {
      const t = e.target as HTMLElement | Document
      const st =
        t instanceof Document
          ? (document.documentElement.scrollTop ?? 0)
          : ((t as HTMLElement).scrollTop ?? 0)
      const l = layer!.querySelector<HTMLElement>('.mf-side-left')
      const r = layer!.querySelector<HTMLElement>('.mf-side-right')
      if (l) l.style.setProperty('--scy', `${-Math.min(80, st * 0.09)}px`)
      if (r) r.style.setProperty('--scy', `${-Math.min(112, st * 0.13)}px`)
    }

    /** 点击：本体回一式 + 粒子迸发，一次动画结束自动收兵 */
    function onTap(e: MouseEvent) {
      const side = (e.target as HTMLElement).closest<HTMLElement>('.mf-side')
      if (!side) return
      const rect = side.getBoundingClientRect()
      side.classList.remove('mf-burst')
      // 强制重排以重启动画
      void side.offsetWidth
      side.classList.add('mf-burst')

      const N = 7
      for (let i = 0; i < N; i++) {
        const p = document.createElement('span')
        p.className = `mf-particle ${PARTICLE_CLASS[kind]}`
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.7
        const dist = 46 + Math.random() * 70
        p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`)
        p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`)
        p.style.setProperty('--rot', `${Math.random() * 220 - 110}deg`)
        p.style.left = `${e.clientX - rect.left}px`
        p.style.top = `${e.clientY - rect.top}px`
        side.appendChild(p)
        window.setTimeout(() => p.remove(), 1300)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    layer.addEventListener('click', onTap)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('scroll', onScroll, { capture: true })
      layer.removeEventListener('click', onTap)
    }
  }, [kind])

  return (
    <div
      className={`mf-layer mf-${kind}`}
      ref={layerRef}
      aria-hidden
      style={tone ? ({ '--mf-tone': tone } as CSSProperties) : undefined}
    >
      <div className="mf-side mf-side-left">
        <svg viewBox="0 0 200 560" className="mf-svg">
          {KIND_SVG[kind]}
        </svg>
      </div>
      <div className="mf-side mf-side-right">
        <svg viewBox="0 0 200 560" className="mf-svg">
          <g transform="translate(200 0) scale(-1 1)">{KIND_SVG[kind]}</g>
        </svg>
      </div>
    </div>
  )
}
