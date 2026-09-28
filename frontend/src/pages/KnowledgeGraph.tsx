import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchHeritageDetail,
  fetchHeritageList,
  type HeritageDetail,
  type HeritageSummary,
} from '../api/heritage'
import { fetchFullGraph, type GraphData, type GraphNode } from '../api/graph'
import { extractProvince } from '../utils/geo'
import '../styles/graph.css'

interface Props {
  onNavigate: (page: string, param?: string) => void
}

/** 官方十大类：固定顺序 = 固定配色与星座方位（数据增减不影响布局语义） */
const CAT_ORDER = [
  '民间文学',
  '传统音乐',
  '传统舞蹈',
  '传统戏剧',
  '曲艺',
  '传统体育、游艺与杂技',
  '传统美术',
  '传统技艺',
  '传统医药',
  '民俗',
]

const CAT_COLOR: Record<string, string> = {
  民间文学: '#8aa6d8',
  传统音乐: '#c98ad4',
  传统舞蹈: '#d4763b',
  传统戏剧: '#b03a2e',
  曲艺: '#d9a96a',
  '传统体育、游艺与杂技': '#8fbf6f',
  传统美术: '#e8c56b',
  传统技艺: '#4a9d8f',
  传统医药: '#a8bdb2',
  民俗: '#c97b7b',
}

interface Star {
  id: string
  name: string
  cat: string
  prov: string
  region: string
  tier: string
  deep: boolean
  x: number
  y: number
  r: number
  phase: number
  /** 每帧写入的屏幕坐标（命中检测用） */
  sx: number
  sy: number
}

interface ProvCluster {
  name: string
  x: number
  y: number
  count: number
}

interface CatGroup {
  name: string
  color: string
  count: number
  deepCount: number
  ax: number
  ay: number
  stars: Star[]
  provs: ProvCluster[]
}

interface Sky {
  groups: CatGroup[]
  stars: Star[]
  byId: Map<string, Star>
  groupByName: Map<string, CatGroup>
  dust: { x: number; y: number; r: number; a: number }[]
  bounds: { x0: number; y0: number; x1: number; y1: number }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mainCat(raw: string): string {
  const first = raw.split('·')[0].trim()
  return CAT_ORDER.includes(first) ? first : raw.trim() || '民俗'
}

/** 把 3299 项排成 10 个星座：大类为星座、省份为星团、项目为星子（确定性布点） */
function buildSky(items: HeritageSummary[]): Sky {
  const rng = mulberry32(20260929)
  const buckets = new Map<string, HeritageSummary[]>()
  for (const it of items) {
    const cat = mainCat(it.category)
    if (!buckets.has(cat)) buckets.set(cat, [])
    buckets.get(cat)!.push(it)
  }
  const order = [
    ...CAT_ORDER.filter((c) => buckets.has(c)),
    ...[...buckets.keys()].filter((c) => !CAT_ORDER.includes(c)),
  ]
  const n = Math.max(order.length, 1)
  const rx = 1250
  const ry = 760

  const groups: CatGroup[] = []
  const stars: Star[] = []
  const byId = new Map<string, Star>()
  const groupByName = new Map<string, CatGroup>()
  let bx0 = Infinity
  let by0 = Infinity
  let bx1 = -Infinity
  let by1 = -Infinity

  order.forEach((cat, i) => {
    const list = buckets.get(cat)!
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const ax = Math.cos(angle) * rx
    const ay = Math.sin(angle) * ry
    const group: CatGroup = {
      name: cat,
      color: CAT_COLOR[cat] ?? '#e8c56b',
      count: list.length,
      deepCount: list.filter((x) => x.tier !== 'index').length,
      ax,
      ay,
      stars: [],
      provs: [],
    }

    // 省份星团：按数量排序后均匀绕星座中心摆一圈
    const provBuckets = new Map<string, HeritageSummary[]>()
    for (const it of list) {
      const p = extractProvince(it.region)
      if (!provBuckets.has(p)) provBuckets.set(p, [])
      provBuckets.get(p)!.push(it)
    }
    const provs = [...provBuckets.entries()].sort((a, b) => b[1].length - a[1].length)
    const ringR = Math.min(150 + provs.length * 16, 330)
    provs.forEach(([pname, plist], pi) => {
      const pa = (pi * 2 * Math.PI) / Math.max(provs.length, 1) + angle * 0.35
      const px = ax + Math.cos(pa) * ringR
      const py = ay + Math.sin(pa) * ringR * 0.78
      group.provs.push({ name: pname, x: px, y: py, count: plist.length })

      const sigma = Math.min(36 + Math.sqrt(plist.length) * 8, 96)
      for (const it of plist) {
        const deep = it.tier !== 'index'
        // 高斯盘内散点：sqrt 保证分布均匀不聚心
        const rr = sigma * Math.sqrt(rng())
        const aa = rng() * Math.PI * 2
        const star: Star = {
          id: it.id,
          name: it.name,
          cat,
          prov: pname,
          region: it.region,
          tier: it.tier,
          deep,
          x: px + Math.cos(aa) * rr,
          y: py + Math.sin(aa) * rr,
          r: deep ? 3.1 : 1.7,
          phase: rng() * Math.PI * 2,
          sx: 0,
          sy: 0,
        }
        group.stars.push(star)
        stars.push(star)
        byId.set(star.id, star)
        bx0 = Math.min(bx0, star.x)
        by0 = Math.min(by0, star.y)
        bx1 = Math.max(bx1, star.x)
        by1 = Math.max(by1, star.y)
      }
    })
    groups.push(group)
    groupByName.set(cat, group)
  })

  const dust = Array.from({ length: 320 }, () => ({
    x: (rng() - 0.5) * 4200,
    y: (rng() - 0.5) * 2800,
    r: 0.5 + rng() * 1.1,
    a: 0.05 + rng() * 0.13,
  }))

  return {
    groups,
    stars,
    byId,
    groupByName,
    dust,
    bounds: { x0: bx0, y0: by0, x1: bx1, y1: by1 },
  }
}

interface View {
  k: number
  x: number
  y: number
}

export default function KnowledgeGraph({ onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [sky, setSky] = useState<Sky | null>(null)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [deepTotal, setDeepTotal] = useState(0)
  const [sel, setSel] = useState<{ kind: 'star'; star: Star } | { kind: 'cat'; cat: CatGroup } | null>(
    null,
  )
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [focusCat, setFocusCat] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Star[]>([])

  const viewRef = useRef<View>({ k: 1, x: 0, y: 0 })
  const animRef = useRef<{ from: View; to: View; t0: number } | null>(null)
  const hoverRef = useRef<Star | null>(null)
  const selRef = useRef<string | null>(null)
  const focusRef = useRef<string | null>(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const startRef = useRef(0)
  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  const skyRef = useRef<Sky | null>(null)

  skyRef.current = sky
  selRef.current = sel?.kind === 'star' ? sel.star.id : null
  focusRef.current = focusCat

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    Promise.all([fetchHeritageList(), fetchFullGraph().catch(() => null)])
      .then(([list, g]) => {
        setSky(buildSky(list))
        setTotal(list.length)
        setDeepTotal(list.filter((x) => x.tier !== 'index').length)
        if (g) setGraph(g)
        startRef.current = performance.now()
      })
      .catch((e) => setError(e.message))
  }, [])

  /** 视图动画：600ms 缓动飞向目标（选星 / 聚焦星座 / 复位共用） */
  function animateTo(k: number, wx: number, wy: number) {
    const { w, h } = sizeRef.current
    const to = { k, x: w / 2 - wx * k, y: h / 2 - wy * k }
    if (reduceMotion) {
      viewRef.current = to
      return
    }
    animRef.current = { from: { ...viewRef.current }, to, t0: performance.now() }
  }

  function fitAll() {
    const s = skyRef.current
    if (!s) return
    const { w, h } = sizeRef.current
    const pad = 140
    const bw = Math.max(s.bounds.x1 - s.bounds.x0, 1)
    const bh = Math.max(s.bounds.y1 - s.bounds.y0, 1)
    const k = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 1.15)
    const cx = (s.bounds.x0 + s.bounds.x1) / 2
    const cy = (s.bounds.y0 + s.bounds.y1) / 2
    animateTo(Math.max(k, 0.28), cx, cy)
  }

  // 主渲染循环：入场波 → 常态微闪；只在需要时重绘（持续 rAF，3k 星量级无压力）
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const oldW = sizeRef.current.w
      const oldH = sizeRef.current.h
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      sizeRef.current = { w, h, dpr }
      // 尺寸变化（如面板/按钮挤占头部）时保持视野中心的世界点不动
      if (oldW > 0 && oldH > 0 && (oldW !== w || oldH !== h)) {
        const dx = (w - oldW) / 2
        const dy = (h - oldH) / 2
        const an = animRef.current
        if (an) {
          an.from.x += dx
          an.from.y += dy
          an.to.x += dx
          an.to.y += dy
        }
        viewRef.current.x += dx
        viewRef.current.y += dy
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    let lastViewStr = ''
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const s = skyRef.current
      const { w, h, dpr } = sizeRef.current
      if (!w || !h) return

      // 视图缓动
      const an = animRef.current
      if (an) {
        const p = Math.min((now - an.t0) / 620, 1)
        const e = 1 - Math.pow(1 - p, 3)
        viewRef.current = {
          k: an.from.k + (an.to.k - an.from.k) * e,
          x: an.from.x + (an.to.x - an.from.x) * e,
          y: an.from.y + (an.to.y - an.from.y) * e,
        }
        if (p >= 1) animRef.current = null
      }
      const v = viewRef.current

      // 测试钩子：视图/选中/聚焦变化时写入 dataset（供 e2e 断言，不触发渲染）
      const viewStr = `${v.k.toFixed(3)},${Math.round(v.x)},${Math.round(v.y)}`
      if (viewStr !== lastViewStr) {
        lastViewStr = viewStr
        canvas.dataset.view = viewStr
      }
      const selStr = selRef.current ?? ''
      const focusStr = focusRef.current ?? ''
      if (canvas.dataset.sel !== selStr) canvas.dataset.sel = selStr
      if (canvas.dataset.focus !== focusStr) canvas.dataset.focus = focusStr

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (!s) return

      const t = reduceMotion ? 1 : Math.min((now - startRef.current) / 1000, 1)
      const w2x = (x: number) => x * v.k + v.x
      const w2y = (y: number) => y * v.k + v.y

      // 星尘（世界坐标，随视图漂移，营造纵深）
      for (const d of s.dust) {
        const sx = w2x(d.x)
        const sy = w2y(d.y)
        if (sx < -8 || sy < -8 || sx > w + 8 || sy > h + 8) continue
        ctx.globalAlpha = d.a * t
        ctx.fillStyle = '#e8c56b'
        ctx.beginPath()
        ctx.arc(sx, sy, d.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const hover = hoverRef.current
      const selected = selRef.current
      const focus = focusRef.current
      const showProv = v.k > 0.85
      const dimOf = (g: CatGroup) => (focus && focus !== g.name ? 0.16 : 1)

      // 星座骨架：星座中心 → 省份星团
      ctx.lineWidth = 1
      for (const g of s.groups) {
        const ga = dimOf(g) * t
        if (ga < 0.05) continue
        ctx.strokeStyle = `rgba(232,197,107,${0.1 * ga})`
        ctx.beginPath()
        for (const p of g.provs) {
          ctx.moveTo(w2x(g.ax), w2y(g.ay))
          ctx.lineTo(w2x(p.x), w2y(p.y))
        }
        ctx.stroke()
      }

      // 星子：入场波（自中心向外点亮）+ 深读亮星微闪
      for (const st of s.stars) {
        const g = s.groupByName.get(st.cat)!
        const base = dimOf(g)
        if (base < 0.05) continue
        const dist = Math.hypot(st.x, st.y)
        const a = reduceMotion ? base : base * Math.min(Math.max((t * 2400 - dist) / 420, 0), 1)
        if (a <= 0.02) continue
        const sx = w2x(st.x)
        const sy = w2y(st.y)
        st.sx = sx
        st.sy = sy
        if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue
        const tw = st.deep && !reduceMotion ? 0.82 + 0.18 * Math.sin(now * 0.0021 + st.phase) : 1
        const r = Math.max(st.r * Math.min(v.k, 2) ** 0.6, st.deep ? 2.2 : 1.3)
        ctx.globalAlpha = a * (st.deep ? tw : 0.85)
        ctx.fillStyle = g.color
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
        if (st.deep) {
          ctx.globalAlpha = a * 0.22 * tw
          ctx.beginPath()
          ctx.arc(sx, sy, r * 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
        if (st.id === selected || st === hover) {
          if (st.id === selected) canvas.dataset.star = `${Math.round(sx)},${Math.round(sy)}`
          ctx.globalAlpha = a
          ctx.strokeStyle = '#f7ead2'
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(sx, sy, r + 4.5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // 省份星团标（拉近才可读）
      if (showProv) {
        ctx.font = '11px "PingFang SC", sans-serif'
        ctx.textAlign = 'center'
        for (const g of s.groups) {
          const ga = dimOf(g) * t
          if (ga < 0.05) continue
          for (const p of g.provs) {
            const sx = w2x(p.x)
            const sy = w2y(p.y)
            if (sx < -60 || sy < -20 || sx > w + 60 || sy > h + 20) continue
            ctx.globalAlpha = Math.min(ga * ((v.k - 0.85) / 0.5), 0.85)
            ctx.fillStyle = '#9a8f80'
            ctx.fillText(p.name, sx, sy + 20)
          }
        }
      }

      // 星座中心：亮核 + 大类名（屏幕恒定字号，拉远仍可读）
      for (const g of s.groups) {
        const ga = dimOf(g) * t
        if (ga < 0.05) continue
        const sx = w2x(g.ax)
        const sy = w2y(g.ay)
        if (sx < -120 || sy < -60 || sx > w + 120 || sy > h + 60) continue
        const pulse = reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(now * 0.0016 + g.count)
        ctx.globalAlpha = ga
        ctx.fillStyle = g.color
        ctx.beginPath()
        ctx.arc(sx, sy, 5.5 * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = ga * 0.3
        ctx.beginPath()
        ctx.arc(sx, sy, 13 * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = ga
        ctx.font = '600 15px "Songti SC", "SimSun", serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#f3ece2'
        ctx.fillText(g.name, sx, sy - 16)
        ctx.font = '11px "PingFang SC", sans-serif'
        ctx.fillStyle = '#9a8f80'
        ctx.fillText(`${g.count} 项`, sx, sy + 26)
      }

      // hover 提示（DOM 定位，直接改样式避免重渲染）
      ctx.globalAlpha = 1
      const tip = tipRef.current
      if (tip) {
        if (hover && (!focus || hover.cat === focus)) {
          tip.style.opacity = '1'
          tip.style.transform = `translate(${Math.min(Math.max(hover.sx + 14, 8), w - 210)}px, ${Math.max(hover.sy - 46, 8)}px)`
          tip.innerHTML = `<strong>${hover.name}</strong><span>${hover.cat} · ${hover.prov}${hover.deep ? ' · 深读' : ''}</span>`
        } else {
          tip.style.opacity = '0'
        }
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [reduceMotion])

  // 指针：滚轮缩放（锚定光标）/ 拖拽平移 / hover 命中 / 点击选中
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let dragging = false
    let moved = false
    let lastX = 0
    let lastY = 0

    const hitTest = (mx: number, my: number): Star | null => {
      const s = skyRef.current
      if (!s) return null
      const focus = focusRef.current
      let best: Star | null = null
      let bestD = 100
      for (const st of s.stars) {
        if (focus && st.cat !== focus) continue
        const d = (st.sx - mx) ** 2 + (st.sy - my) ** 2
        const rr = Math.max(st.r * 3.4, 7) ** 2
        if (d < rr && d < bestD) {
          bestD = d
          best = st
        }
      }
      return best
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = viewRef.current
      const factor = Math.exp(-e.deltaY * 0.0016)
      const k = Math.min(Math.max(v.k * factor, 0.26), 4.2)
      const mx = e.clientX - wrap.getBoundingClientRect().left
      const my = e.clientY - wrap.getBoundingClientRect().top
      // 锚定光标：缩放前后光标下的世界点保持不动
      const wx = (mx - v.x) / v.k
      const wy = (my - v.y) / v.k
      viewRef.current = { k, x: mx - wx * k, y: my - wy * k }
      animRef.current = null
    }

    const onDown = (e: PointerEvent) => {
      dragging = true
      moved = false
      lastX = e.clientX
      lastY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      mouseRef.current = { x: mx, y: my }
      if (dragging) {
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true
        lastX = e.clientX
        lastY = e.clientY
        viewRef.current.x += dx
        viewRef.current.y += dy
        animRef.current = null
        return
      }
      const hit = hitTest(mx, my)
      canvas.dataset.hover = hit ? `${hit.id}@${Math.round(mx)},${Math.round(my)}` : `@${Math.round(mx)},${Math.round(my)}`
      if (hit !== hoverRef.current) {
        hoverRef.current = hit
        canvas.style.cursor = hit ? 'pointer' : 'grab'
      }
    }
    const onUp = (e: PointerEvent) => {
      if (dragging) {
        dragging = false
        canvas.releasePointerCapture(e.pointerId)
      }
      if (moved) return
      const rect = wrap.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hit = hitTest(mx, my)
      if (hit) {
        selectStar(hit)
        return
      }
      // 没点中星子 → 试星座中心
      const s = skyRef.current
      if (s) {
        const v = viewRef.current
        for (const g of s.groups) {
          const sx = g.ax * v.k + v.x
          const sy = g.ay * v.k + v.y
          if ((sx - mx) ** 2 + (sy - my) ** 2 < 18 ** 2) {
            focusCategory(g.name)
            return
          }
        }
      }
      setSel(null)
      setDetail(null)
      setFocusCat(null)
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', () => {
      hoverRef.current = null
    })
    canvas.style.cursor = 'grab'
    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
    }
    // 命中回调走事件时的最新渲染（selectStar/focusCategory 语义不随 effect 生命周期变化）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 数据就绪后铺一次全图
  useEffect(() => {
    if (sky) fitAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sky])

  function selectStar(st: Star) {
    setSel({ kind: 'star', star: st })
    setDetail(null)
    setFocusCat(null)
    if (st.deep) fetchHeritageDetail(st.id).then(setDetail).catch(() => setDetail(null))
    animateTo(Math.max(viewRef.current.k, 1.7), st.x, st.y)
  }

  function focusCategory(name: string) {
    // 事件闭包持有挂载时的版本，数据源必须走 skyRef（渲染期已同步）
    const g = skyRef.current?.groupByName.get(name)
    if (!g) return
    setFocusCat(name)
    setSel({ kind: 'cat', cat: g })
    setDetail(null)
    animateTo(1.25, g.ax, g.ay)
  }

  function resetView() {
    setFocusCat(null)
    setSel(null)
    setDetail(null)
    fitAll()
  }

  function zoomBy(f: number) {
    const { w, h } = sizeRef.current
    const v = viewRef.current
    const k = Math.min(Math.max(v.k * f, 0.26), 4.2)
    const wx = (w / 2 - v.x) / v.k
    const wy = (h / 2 - v.y) / v.k
    animateTo(k, wx, wy)
  }

  function onSearch(q: string) {
    setQuery(q)
    const key = q.trim()
    if (!key || !sky) {
      setResults([])
      return
    }
    const matches = sky.stars.filter(
      (st) => st.name.includes(key) || st.prov.includes(key) || st.cat.includes(key),
    )
    // 全名命中排最前，保证「按名选星」的直达体验
    matches.sort((a, b) => Number(b.name === key) - Number(a.name === key))
    setResults(matches.slice(0, 8))
  }

  /** 面板关联行：沿用图谱数据（深读档案才有关系边） */
  const relations = useMemo(() => {
    if (!graph || !sel || sel.kind !== 'star') return []
    const out: { name: string; relation: string; other: GraphNode }[] = []
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
    for (const l of graph.links) {
      if (l.source === sel.star.id) {
        const other = nodeById.get(l.target)
        if (other) out.push({ name: other.label, relation: l.relation, other })
      } else if (l.target === sel.star.id) {
        const other = nodeById.get(l.source)
        if (other) out.push({ name: other.label, relation: l.relation, other })
      }
    }
    return out
  }, [graph, sel])

  function openRelation(r: { other: GraphNode }) {
    const t = r.other
    if (t.type === 'heritage') onNavigate('knowledge', t.id)
    else if (t.type === 'region') onNavigate('map', t.label)
    else if (t.type === 'category') onNavigate('knowledge', `kw:${t.label}`)
    else onNavigate('knowledge')
  }

  const selectedStar = sel?.kind === 'star' ? sel.star : null
  const selectedCat = sel?.kind === 'cat' ? sel.cat : null

  return (
    <div className="graph-page">
      <header className="graph-header">
        <h1>非遗星图</h1>
        <p>
          {total ? `${total} 项国家级非遗化作星子，大类为星座、省份为星团` : '加载中…'}
          {deepTotal ? ` · 亮星是深读档案 ${deepTotal} 颗` : ''}
          。滚轮缩放、拖拽平移，点星看详情，点星座中心看全类
        </p>
        <div className="graph-legend">
          {sky?.groups.map((g) => (
            <button
              key={g.name}
              className={`graph-legend-item ${focusCat === g.name ? 'is-active' : ''}`}
              onClick={() => (focusCat === g.name ? resetView() : focusCategory(g.name))}
              title={`${g.name}：${g.count} 项（深读 ${g.deepCount}）`}
            >
              <i style={{ background: g.color }} />
              {g.name}
              <em>{g.count}</em>
            </button>
          ))}
          {(focusCat || sel) && (
            <button className="graph-reset" onClick={resetView}>
              返回全图
            </button>
          )}
        </div>
        <div className="graph-search">
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜项目名、省份或大类…"
          />
          {results.length > 0 && (
            <div className="graph-search-list">
              {results.map((st) => (
                <button
                  key={st.id}
                  className="graph-search-item"
                  onClick={() => {
                    selectStar(st)
                    setQuery('')
                    setResults([])
                  }}
                >
                  <strong>{st.name}</strong>
                  <span>
                    {st.cat} · {st.prov}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {error && <div className="graph-error">{error}</div>}
      {!sky && !error && <div className="graph-loading">星图加载中…</div>}

      <div className="graph-sky" ref={wrapRef}>
        <canvas ref={canvasRef} className="graph-canvas" />
        <div className="graph-tip" ref={tipRef} aria-hidden />
      </div>

      <div className="graph-zoom">
        <button onClick={() => zoomBy(1.4)} title="放大">
          ＋
        </button>
        <button onClick={() => zoomBy(1 / 1.4)} title="缩小">
          －
        </button>
        <button onClick={resetView} title="复位视图">
          ⤢
        </button>
      </div>

      {sel && (
        <div className="graph-detail">
          <div className="graph-detail-head">
            <strong>{selectedStar ? selectedStar.name : selectedCat?.name}</strong>
            <span
              className="graph-detail-type"
              style={{ color: selectedStar ? (selectedStar.deep ? '#e8c56b' : '#9a8f80') : selectedCat?.color }}
            >
              {selectedStar ? (selectedStar.deep ? '深读亮星' : '名录微星') : '星座'}
            </span>
            <button
              className="graph-close"
              onClick={() => {
                setSel(null)
                setDetail(null)
              }}
            >
              ×
            </button>
          </div>

          {selectedStar && (
            <div className="graph-detail-info">
              {selectedStar.deep ? (
                detail ? (
                  <>
                    <p>{detail.description.slice(0, 140)}…</p>
                    <span>
                      {detail.category} · {detail.region} · {detail.level}
                    </span>
                  </>
                ) : (
                  <p className="graph-loading-line">简介加载中…</p>
                )
              ) : (
                <>
                  <p>
                    全国名录在册项目，{selectedStar.cat} · {selectedStar.prov}
                    。索引层暂无深读档案，可在知识库查看简述与来源。
                  </p>
                  <span>{selectedStar.region}</span>
                </>
              )}
            </div>
          )}

          {selectedCat && (
            <div className="graph-detail-info">
              <p>
                该星座 {selectedCat.count} 项，其中深读档案 {selectedCat.deepCount} 份；覆盖{' '}
                {selectedCat.provs.length} 个省级行政区，点下方直达知识库筛选。
              </p>
            </div>
          )}

          <div className="graph-detail-actions">
            {selectedStar && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('knowledge', selectedStar.id)}
              >
                查看知识库详情 →
              </button>
            )}
            {selectedStar && (
              <button
                className="graph-btn"
                onClick={() => onNavigate('map', extractProvince(selectedStar.region))}
              >
                去非遗地图
              </button>
            )}
            {selectedCat && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('knowledge', `kw:${selectedCat.name}`)}
              >
                去知识库筛选 →
              </button>
            )}
          </div>

          {selectedStar && relations.length > 0 && (
            <div className="graph-relations">
              <em>关联 {relations.length} 项 · 点击可跳转</em>
              {relations.slice(0, 10).map((r, i) => (
                <button
                  key={i}
                  className="graph-relation-line"
                  onClick={() => openRelation(r)}
                  title="点击跳转到对应页面"
                >
                  <span className="graph-relation-tag">{r.relation}</span>
                  {r.name}
                  <span className="graph-relation-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
