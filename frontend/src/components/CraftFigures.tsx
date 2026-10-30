/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 原创点：揭幕转场视觉核心 —— 十一站各一位专属「正在做手艺」的皮影风格小人
 * （展卷 / 挥毫 / 翻书 / 牵丝 / 点舆图 / 水袖 / 登阶 / 剪纸 / 猜灯谜 / 钤印 / 提灯望檐），
 * 关节逐件分层（头 / 身 / 左右臂 / 腿 / 道具），由 craftFigures.css 驱动精细循环动画，
 * 双扇门从中缝向两侧揭开，小人立于台前表演直至整幕淡出。
 */
import type { CSSProperties, ReactElement } from 'react'
import type { CraftKey } from '../guideStations'
import '../styles/craftFigures.css'

/* 视框 200×260：台面约 y=232，人物中轴 x=100；主剪影随主题变色（currentColor），
   站色饰件用 .acc（--gate-b），描金色用 .accr（--gate-a），线描写 .ln。 */

function FigureScroll() {
  return (
    <g className="gf gf-scroll">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 226h80c0-54-6-104-16-132-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 98C60 104 50 112 47 120l8 6c7-8 17-14 27-20 3-2 5-5 6-8z" />
      </g>
      <g className="m-rarm">
        <path d="M122 98c18 6 28 14 31 22l-8 6c-7-8-17-14-27-20-3-2-5-5-6-8z" />
      </g>
      <rect className="acc m-p1" x="44" y="104" width="9" height="40" rx="4" />
      <rect className="acc m-p2" x="147" y="104" width="9" height="40" rx="4" />
      <rect className="accr m-p3" x="53" y="110" width="94" height="28" rx="2" />
    </g>
  )
}

function FigureBrush() {
  return (
    <g className="gf gf-brush">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 216h80c0-44-6-94-16-122-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <g className="m-p1">
        <path d="M40 198h120v7H40zM48 205h5v25h-5zM147 205h5v25h-5z" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96C62 116 58 144 66 164c6 4 14-8 16-30 2-20 0-30 2-38z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c10 26 8 54-4 74 6 2 13-8 17-30 4-24 1-38-5-46z" />
        <circle cx="118" cy="173" r="5" />
        <path d="M114 168h7v20h-7z" />
        <path className="m-p3 acc" d="M110 190h12l-6 9z" />
      </g>
      <path className="acc m-p2" d="M60 186h80v11H60z" />
    </g>
  )
}

function FigureBook() {
  return (
    <g className="gf gf-book">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 226h80c0-54-6-104-16-132-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <path className="accr m-p1" d="M64 120 100 114v34l-36 2z" />
      <path className="accr m-p2" d="M100 114l38 4 4 32-42-2z" />
      <g className="m-larm">
        <path d="M78 96c-18 16-20 32-10 44 6 5 14-6 16-22 1-11-1-18 0-24z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c18 14 20 30 14 42-6 5-14-5-16-20-1-11 1-18 0-24z" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
    </g>
  )
}

function FigureSilk() {
  return (
    <g className="gf gf-silk">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 226h80c0-54-6-104-16-132-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <g className="m-p1 acc">
        <path d="M56 88h5V62h-5zM139 88h5V62h-5zM54 62h92v6H54z" />
      </g>
      <path className="ln m-p2" d="M67 68 90 126M100 68v60M133 68l-23 58" />
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-18 12-10 22 4 32 4 3 8-2 8-9 0-9-4-16-6-23z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c18 12 10 22-4 32-4 3-8-2-8-9 0-9 4-16 6-23z" />
      </g>
    </g>
  )
}

function FigureMap() {
  return (
    <g className="gf gf-map">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-p1" transform="rotate(-3 74 134)">
        <rect x="36" y="78" width="76" height="112" rx="3" fill="currentColor" opacity="0.92" />
        <path className="ln" d="M46 100q16-16 34-2t32 2q-14 20-32 12t-34 7" />
        <rect className="acc" x="31" y="70" width="88" height="9" rx="3" />
      </g>
      <g className="m-body">
        <path d="M76 94C66 122 60 172 66 226h8c6-54 10-104 8-132l6-10c-10-9-28-9-38 0z" />
      </g>
      <g className="m-head">
        <path d="M92 64h14v24H92z" />
        <circle cx="99" cy="53" r="16" />
        <circle cx="99" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-12 18-14 36-10 54 5 3 9-6 10-21 1-15 1-24 5-31z" />
      </g>
      <g className="m-rarm">
        <path d="M120 96c14-6 20 2 18 18 4 2 11-5 11-14 0-10-9-14-21-8z" />
      </g>
    </g>
  )
}

function FigureSleeves() {
  return (
    <g className="gf gf-sleeves">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M88 146c-3 26-5 52-7 80h13c-1-26 2-54 5-80z" />
      <path d="M112 146c3 26 5 52 7 80h-13c1-26-2-54-5-80z" />
      <g className="m-body">
        <path d="M76 94C66 114 62 136 62 158h76c0-22-4-44-14-64-10-12-34-12-44 0z" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v22H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="92" cy="39" r="5.5" />
        <circle cx="108" cy="39" r="5.5" />
      </g>
      <g className="m-larm">
        <path d="M78 94C56 72 40 64 24 60c8 13 30 26 54 38z" />
        <path className="m-p1" d="M24 60C2 78-2 108 22 130 8 110 12 84 30 70z" />
      </g>
      <g className="m-rarm">
        <path d="M122 94c22-22 38-30 54-34-8 13-30 26-54 38z" />
        <path className="m-p2" d="M176 60c22 18 26 48 2 70 14-20 10-46-8-60z" />
      </g>
    </g>
  )
}

function FigureSteps() {
  return (
    <g className="gf gf-steps">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <g className="m-p1">
        <path className="acc" d="M112 188h70v13h-70z" opacity="0.9" />
        <path className="acc" d="M136 160h62v13h-62z" />
        <path className="acc" d="M158 132h46v13h-46z" opacity="0.65" />
      </g>
      <path d="M88 148c-3 28-5 52-7 78h16c0-26 2-52 4-78z" />
      <g className="m-rleg">
        <path d="M112 148c10 12 26 24 32 28 6 4 8 10 4 15l-12 2c4-7 1-14-6-17-8-5-16-14-20-22z" />
      </g>
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 212h80c0-40-6-90-16-118-4-6-12-9-24-9s-20 3-24 9z" transform="rotate(4 100 150)" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-12 14-14 30-6 44 4 3 11-5 12-18 1-13-1-20 0-26z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c12 14 14 30 6 44-4 3-11-5-12-18-1-13 1-20 0-26z" />
      </g>
    </g>
  )
}

function FigureCut() {
  return (
    <g className="gf gf-cut">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 226h80c0-54-6-104-16-132-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <g className="m-p1">
        <path className="acc" d="M52 125h28v28H52z" opacity="0.9" />
        <path d="M58 146l8-8 8 8" className="lnd" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-18 14-24 30-16 44 5 5 12-4 14-19 2-11 1-19 2-25z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c12 14 8 30-1 43 5 5 14-2 16-13 2-15-2-24-8-30z" />
      </g>
      <g className="m-p2">
        <circle className="accr" cx="120" cy="142" r="2.5" />
        <path className="m-p3" d="M121 142 89 125l-1-9 34 20z" />
        <path className="m-p4" d="M119 142l30-11 1-8-28 10z" />
      </g>
    </g>
  )
}

function FigureRiddle() {
  return (
    <g className="gf gf-riddle">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 226h80c0-54-6-104-16-132-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <g className="m-p1">
        <path className="ln" d="M148 50v18" />
        <rect className="accr" x="141" y="68" width="14" height="30" rx="2" opacity="0.95" />
        <circle cx="148" cy="75" r="1.8" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-18-6-22-18-14-30 4-4 10 0 8 10-1 8 4 16 10 20z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c12 10 17 24 11 40-2 2-7-4-5-14 2-13-2-21-8-26z" />
      </g>
    </g>
  )
}

function FigureSeal() {
  return (
    <g className="gf gf-seal">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-p1">
        <path d="M46 196h108v7H46zM52 203h5v25h-5zM143 203h5v25h-5z" />
      </g>
      <path className="acc m-p2" d="M60 183h80v12H60z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 210h80c0-38-6-88-16-116-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-20 20-24 50-14 74 4 4 12-5 14-22 2-20 3-38 4-52z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c6-22-2-38-10-46-4-2-9 5-5 16 3 12 8 20 9 28z" />
        <path className="acc m-p3" d="M101 33h16v17h-16z" />
        <circle cx="109" cy="30" r="4" />
      </g>
    </g>
  )
}

function FigureLantern() {
  return (
    <g className="gf gf-lantern">
      <ellipse className="gf-ground" cx="100" cy="236" rx="34" ry="6" />
      <path d="M66 224c0 8 16 8 16 0z" />
      <path d="M118 224c0 8 16 8 16 0z" />
      <g className="m-body">
        <path d="M76 94C66 122 60 172 60 226h80c0-54-6-104-16-132-4-6-12-9-24-9s-20 3-24 9z" />
      </g>
      <path className="m-p2" d="M126 112h5v90h-5z" />
      <g className="m-head">
        <path d="M92 64h16v24H92z" />
        <circle cx="100" cy="53" r="16" />
        <circle cx="100" cy="36" r="6.5" />
      </g>
      <g className="m-larm">
        <path d="M78 96c-10-20-2-38 14-51 5-2 8 6 0 11-9 6-10 22-6 36z" />
      </g>
      <g className="m-rarm">
        <path d="M122 96c6 8 6 16 2 24-3 3-7-2-5-10 1-10-2-11-5-13z" />
      </g>
      <g className="m-p3">
        <path className="acc" d="M122 202q6-7 12 0z" />
        <ellipse className="accr" cx="128" cy="215" rx="10" ry="13" />
        <path className="lnd" d="M121 207q7 6 14 0M121 223q7-6 14 0" />
        <path className="ln" d="M128 228v8" />
        <circle className="gw m-p4" cx="128" cy="213" r="4" />
      </g>
    </g>
  )
}

const FIGURES: Record<CraftKey, () => ReactElement> = {
  scroll: FigureScroll,
  brush: FigureBrush,
  book: FigureBook,
  silk: FigureSilk,
  map: FigureMap,
  sleeves: FigureSleeves,
  steps: FigureSteps,
  cut: FigureCut,
  riddle: FigureRiddle,
  seal: FigureSeal,
  lantern: FigureLantern,
}

interface VeilProps {
  craft: CraftKey
  a: string
  b: string
}

/**
 * 揭幕转场幕布：站色双扇盖满全屏（--gate-a/b），中缝金线一亮双扇左右揭开，
 * 台前小人从入场起持续表演（台座光晕随站色），最后整幕连同小人一并淡去。
 */
export default function GateVeil({ craft, a, b }: VeilProps) {
  const Figure = FIGURES[craft] ?? FigureScroll
  return (
    <div
      className="gate-veil"
      style={{ '--gate-a': a, '--gate-b': b } as CSSProperties}
      aria-hidden
    >
      <i className="gate-glow" />
      <i className="gate-door gate-door-l" />
      <i className="gate-door gate-door-r" />
      <i className="gate-seam" />
      <div className="gate-stage">
        <svg className="gate-figure" viewBox="0 0 200 260" role="img">
          <Figure />
        </svg>
      </div>
    </div>
  )
}