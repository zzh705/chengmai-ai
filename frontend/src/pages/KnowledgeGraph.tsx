import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import * as d3 from 'd3'
import { fetchHeritageDetail, type HeritageDetail } from '../api/heritage'
import { fetchFullGraph, type GraphData, type GraphNode } from '../api/graph'
import { extractProvince } from '../utils/geo'
import { useTheme } from '../utils/theme'
import '../styles/graph.css'

interface Props {
  onNavigate: (page: string, param?: string) => void
}

/** 节点类型 → 传统色（暗墨主题：低饱和、墨底上如墨色层次） */
const TYPE_COLOR: Record<GraphNode['type'], string> = {
  heritage: '#b03a2e', // 朱红：非遗本体
  category: '#e8c56b', // 描金：十大类
  region: '#4f8f7b', // 青碧：地域（不进族谱，留作图例）
  person: '#4f8f7b', // 青碧：传承人
  work: '#b03a2e', // 朱红：代表作品
  source: '#e8c56b', // 描金：出处
}

/** 节点类型 → 传统色（亮纸主题：描金、青碧加深，朱红不变） */
const TYPE_COLOR_LIGHT: Record<GraphNode['type'], string> = {
  heritage: '#b03a2e',
  category: '#96731f',
  region: '#36705e',
  person: '#36705e',
  work: '#b03a2e',
  source: '#96731f',
}

const TYPE_LABEL: Record<GraphNode['type'], string> = {
  heritage: '非遗',
  category: '类别',
  region: '地域',
  person: '传承人',
  work: '作品',
  source: '出处',
}

/** 族谱节点：root → 十大类 → 非遗 → 传承人（外叶） */
interface TreeNode extends GraphNode {
  children?: TreeNode[]
}

/** 全量收录口径：国家级非遗代表性项目总数（与登录页、关于页一致） */
const COLLECTION_TOTAL = 3299

/** 星野环带：以三千星尘拟全量收录（静态、aria-hidden，memo 隔离 hover 重渲染） */
const StarField = memo(function StarField({
  stars,
  color,
}: {
  stars: { x: string; y: string; r: number; o: number }[]
  color: string
}) {
  return (
    <g className="graph-starfield" aria-hidden>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={color} opacity={s.o} />
      ))}
    </g>
  )
})

/** 把后端扁平 {nodes, links} 组装成「根 → 类别 → 非遗 → 传承人」径向族谱 */
function buildTree(graph: GraphData): TreeNode {
  const treeNodes = new Map<string, TreeNode>()
  const root: TreeNode = { id: '__root', label: '', type: 'heritage', children: [] }
  treeNodes.set('__root', root)

  // 内环：十大类
  for (const n of graph.nodes) {
    if (n.type === 'category') {
      const tn: TreeNode = { ...n, children: [] }
      treeNodes.set(n.id, tn)
      root.children!.push(tn)
    }
  }

  // 中环：非遗挂到其首个「属于」类别下
  for (const n of graph.nodes) {
    if (n.type !== 'heritage') continue
    const catLink = graph.links.find((l) => l.source === n.id && l.relation === '属于')
    if (!catLink) continue
    const parent = treeNodes.get(catLink.target)
    if (!parent || !parent.children) continue
    const tn: TreeNode = { ...n, children: [] }
    treeNodes.set(n.id, tn)
    parent.children.push(tn)
  }

  // 外叶：传承人挂到对应非遗下（其余关系由详情面板承载，族谱只显传承谱系）
  for (const n of graph.nodes) {
    if (n.type !== 'person') continue
    const parentLink = graph.links.find((l) => l.target === n.id && l.relation === '关联传承人')
    if (!parentLink) continue
    const parent = treeNodes.get(parentLink.source)
    if (!parent || !parent.children) continue
    parent.children.push({ ...n, children: [] })
  }

  // 空类别剔除，避免占位
  root.children = root.children!.filter((c) => c.children && c.children.length > 0)
  return root
}

type HNode = d3.HierarchyNode<TreeNode> & { x: number; y: number }

/** 径向坐标转换：d.x 为角度（弧度），d.y 为半径 */
function radialXY(d: HNode): { x: number; y: number } {
  const angle = d.x - Math.PI / 2
  return { x: d.y * Math.cos(angle), y: d.y * Math.sin(angle) }
}

export default function KnowledgeGraph({ onNavigate }: Props) {
  const theme = useTheme()
  const isLight = theme === 'light'
  const typeColor = isLight ? TYPE_COLOR_LIGHT : TYPE_COLOR
  // 装饰金（星尘/薪火/刻度环/选中描边）随主题换色
  const goldEmber = isLight ? '#b0882f' : '#e8c56b'
  const selStroke = isLight ? '#211b14' : '#f3ece2'
  const glowStroke = isLight ? 'rgba(150,115,31,0.65)' : 'rgba(232,197,107,0.6)'
  const ringStroke = isLight ? 'rgba(150,115,31,0.22)' : 'rgba(232,197,107,0.12)'
  const ringStrokeFaint = isLight ? 'rgba(150,115,31,0.12)' : 'rgba(232,197,107,0.06)'
  const tickStroke = isLight ? 'rgba(150,115,31,0.3)' : 'rgba(232,197,107,0.18)'
  const starFill = isLight ? 'rgba(150,115,31,0.5)' : 'rgba(232,197,107,0.4)'
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [error, setError] = useState('')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)
  const [focusType, setFocusType] = useState<string | null>(null)
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  // 简介拉取失败：显式错误态与重试，不再永久停在「加载中」
  const [detailError, setDetailError] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GraphNode[]>([])
  const [size, setSize] = useState({ w: 800, h: 600 })
  // 点击节点的墨晕涟漪（1.15s 后由定时器摘除）
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const rippleSeq = useRef(0)
  // 寻脉：点亮当前节点到族谱根部的传承链
  const [traceOn, setTraceOn] = useState(false)

  // 一跳邻域（hover/选中）：基于后端 links 实时算
  const hood = useMemo(() => {
    const set = new Set<string>()
    const active = selId ?? hoverId
    if (!active || !graph) return set
    set.add(active)
    for (const l of graph.links) {
      if (l.source === active) set.add(l.target)
      if (l.target === active) set.add(l.source)
    }
    return set
  }, [selId, hoverId, graph])

  // 族谱拉取独立成函数：错误态「重试」复用
  function loadGraph() {
    setError('')
    fetchFullGraph()
      .then(setGraph)
      .catch((e) => setError(`族谱暂未取到，请稍后重试（${e instanceof Error ? e.message : '网络异常'}）`))
  }

  useEffect(() => {
    loadGraph()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 容器尺寸自适应（下限 288：320px 屏留 16px 边距也不裁切）
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(288, r.width), h: Math.max(288, r.height) })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // 径向族谱布局（数据变化时重算）
  const layout = useMemo(() => {
    if (!graph) return null
    const treeData = buildTree(graph)
    const root = d3.hierarchy<TreeNode>(treeData) as unknown as HNode
    // 半径：以画布短边为基准，外圈留余地放传承人
    const radius = Math.min(size.w, size.h) / 2 - 60
    const treeLayout = d3
      .cluster<TreeNode>()
      .size([2 * Math.PI, Math.max(180, radius)])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.6) / a.depth)
    treeLayout(root as unknown as d3.HierarchyNode<TreeNode>)
    const nodes = root.descendants() as HNode[]
    const links = root.links() as { source: HNode; target: HNode }[]
    // 节点 id → HNode 反查（搜索跳转/选中高亮用）
    const byId = new Map<string, HNode>()
    for (const n of nodes) byId.set(n.data.id, n)
    return { root, nodes, links, byId }
  }, [graph, size.w, size.h])

  // Reduced-motion：尊重系统偏好，关闭自转 / 脉动 / 薪火粒子
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // 浑天刻度环：外环 + 24 刻度 + 四向 + 28 星点（均在自转 g 内）
  // starSeeds 为一次性随机种子（rNorm 0-1、角度、不透明度），useState 初始化期生成；
  // armillary useMemo 内仅做纯缩放，不在渲染期调用 Math.random
  const [starSeeds] = useState(() =>
    Array.from({ length: 28 }, () => ({
      rNorm: Math.random(),
      a: Math.random() * Math.PI * 2,
      opacity: 0.25 + Math.random() * 0.25,
    })),
  )
  const armillary = useMemo(() => {
    const outerR = Math.min(size.w, size.h) / 2 - 30
    const ticks: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (let i = 0; i < 24; i++) {
      // 0°朝北：减 90° 把 0° 旋到画面顶部
      const a = (i * 15 - 90) * (Math.PI / 180)
      const major = i % 6 === 0 // 0/90/180/270 → 北东南西
      const L = major ? 8 : 4
      ticks.push({
        x1: outerR * Math.cos(a),
        y1: outerR * Math.sin(a),
        x2: (outerR - L) * Math.cos(a),
        y2: (outerR - L) * Math.sin(a),
      })
    }
    const cardinals = [
      { x: 0, y: -outerR + 16, text: '北' },
      { x: outerR - 16, y: 0, text: '东' },
      { x: 0, y: outerR - 16, text: '南' },
      { x: -outerR + 16, y: 0, text: '西' },
    ]
    const minR = 60
    const maxR = Math.min(size.w, size.h) / 2 - 50
    const stars = starSeeds.map((s) => {
      const r = minR + s.rNorm * Math.max(0, maxR - minR)
      return {
        cx: r * Math.cos(s.a),
        cy: r * Math.sin(s.a),
        opacity: s.opacity,
      }
    })
    return { outerR, ticks, cardinals, stars }
  }, [size.w, size.h, starSeeds])

  // 径向薪火粒子：14 颗，沿随机角向心飘移；相位错开
  // emberInit 为一次性随机参数（angle/size/初始 cycleT），仅供渲染期读取；
  // emberLive 为 rAF 实时改写的 cycleT，只在 effect 中访问，避免渲染期读 ref
  const EMBER_COUNT = 14
  const [emberInit] = useState(() =>
    Array.from({ length: EMBER_COUNT }, (_, i) => ({
      angle: (i / EMBER_COUNT) * Math.PI * 2 + Math.random() * 0.4,
      cycleT: i / EMBER_COUNT,
      size: 1.2 + Math.random() * 0.6,
    })),
  )
  const emberLive = useRef(emberInit.map((e) => ({ cycleT: e.cycleT })))
  const emberRefs = useRef<(SVGCircleElement | null)[]>([])

  // 薪火粒子初始 DOM（rAF 接手前先把节点放到正确位置，避免闪烁）
  const emberElements = useMemo(() => {
    const radius = Math.max(180, Math.min(size.w, size.h) / 2 - 60)
    if (prefersReducedMotion) {
      // 静态降级：粒子停在半程，作黯淡星点
      return emberInit.map((e, i) => {
        const r = radius * 0.5
        const x = r * Math.cos(e.angle - Math.PI / 2)
        const y = r * Math.sin(e.angle - Math.PI / 2)
        return <circle key={i} cx={x} cy={y} r={e.size} fill={goldEmber} opacity={0.25} />
      })
    }
    return emberInit.map((e, i) => {
      const r = radius * (1 - e.cycleT)
      const x = r * Math.cos(e.angle - Math.PI / 2)
      const y = r * Math.sin(e.angle - Math.PI / 2)
      let opacity: number
      if (e.cycleT < 0.5) {
        opacity = (0.6 * e.cycleT) / 0.5
      } else {
        opacity = 0.6 + (0.2 - 0.6) * ((e.cycleT - 0.5) / 0.5)
      }
      return (
        <circle
          key={i}
          ref={(el) => {
            emberRefs.current[i] = el
          }}
          cx={0}
          cy={0}
          r={e.size}
          fill={goldEmber}
          opacity={opacity}
          transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}
        />
      )
    })
  }, [size.w, size.h, prefersReducedMotion, emberInit, goldEmber])

  // 薪火 rAF：cycleT 0→1 用 ~10s；到 0 即归位外环重启
  useEffect(() => {
    if (prefersReducedMotion) return
    let raf = 0
    let lastTime = performance.now()
    const radius = Math.max(180, Math.min(size.w, size.h) / 2 - 60)
    const tick = (now: number) => {
      // dt 上限 0.05s，防切后台再回前台时跨大步
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      for (let i = 0; i < emberLive.current.length; i++) {
        const live = emberLive.current[i]
        const angle = emberInit[i].angle
        live.cycleT += dt / 10
        if (live.cycleT >= 1) live.cycleT -= 1
        const r = radius * (1 - live.cycleT)
        const x = r * Math.cos(angle - Math.PI / 2)
        const y = r * Math.sin(angle - Math.PI / 2)
        let opacity: number
        if (live.cycleT < 0.5) {
          opacity = (0.6 * live.cycleT) / 0.5
        } else {
          opacity = 0.6 + (0.2 - 0.6) * ((live.cycleT - 0.5) / 0.5)
        }
        const el = emberRefs.current[i]
        if (el) {
          el.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`)
          el.setAttribute('opacity', opacity.toFixed(3))
        }
      }
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      lastTime = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [size.w, size.h, prefersReducedMotion, emberInit])

  // 星野种子：三千星尘各取一枚随机相位（mulberry32 确定性伪随机，重渲染不闪变）
  const [dustSeeds] = useState(() => {
    let s = 20260930
    const rand = () => {
      s = (s + 0x6d2b79f5) | 0
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    return Array.from({ length: COLLECTION_TOTAL }, () => ({
      a: rand() * Math.PI * 2,
      rNorm: rand(),
      bright: rand(),
      o: 0.1 + rand() * 0.2,
    }))
  })

  // 星野环带坐标：夹在族谱外叶与浑天刻度环之间的窄带，密如星河
  const dustField = useMemo(() => {
    const outer = Math.min(size.w, size.h) / 2 - 34
    const inner = outer - 42
    const stars = dustSeeds.map((d) => {
      const r = inner + d.rNorm * (outer - inner)
      // 少量亮星（约 3%）提起层次，如星河中的动星
      const major = d.bright > 0.97
      return {
        x: (r * Math.cos(d.a)).toFixed(1),
        y: (r * Math.sin(d.a)).toFixed(1),
        r: major ? 1.2 : 0.4 + d.bright * 0.5,
        o: major ? 0.55 : d.o,
      }
    })
    return { stars, outer }
  }, [size.w, size.h, dustSeeds])

  // d3-zoom：拖拽平移、滚轮缩放
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svg = d3.select(svgRef.current)
    const g = d3.select(gRef.current)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 6])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()))
    svg.call(zoom)
    // 初始定位：把族谱中心对到画布中心，1:1 铺满画幅
    const cx = size.w / 2
    const cy = size.h / 2
    svg.call(zoom.transform as never, d3.zoomIdentity.translate(cx, cy).scale(1))
    return () => {
      svg.on('.zoom', null)
    }
  }, [size.w, size.h, graph])

  function onNodeHover(node: GraphNode | null): void {
    setHoverId(node?.id ?? null)
  }

  /** 拉取非遗简介：失败显错误态 + 重试，不永久「加载中」 */
  function loadDetail(id: string): void {
    setDetail(null)
    setDetailError(false)
    fetchHeritageDetail(id)
      .then(setDetail)
      .catch(() => setDetailError(true))
  }

  function onNodeClick(node: GraphNode): void {
    setSelId(node.id)
    setTraceOn(false)
    if (node.type === 'heritage') {
      loadDetail(node.id)
    }
    // 墨晕涟漪：在节点处荡开两圈
    if (layout && !prefersReducedMotion) {
      const h = layout.byId.get(node.id)
      if (h) {
        const p = radialXY(h)
        const id = ++rippleSeq.current
        setRipples((rs) => [...rs.slice(-5), { id, x: p.x, y: p.y }])
        window.setTimeout(() => {
          setRipples((rs) => rs.filter((r) => r.id !== id))
        }, 1500)
      }
    }
    // 平滑聚焦：把节点居中、缩放到 1.4
    if (layout && svgRef.current && gRef.current) {
      const h = layout.byId.get(node.id)
      if (h) {
        const p = radialXY(h)
        const t = d3.zoomIdentity
          .translate(size.w / 2 - p.x * 1.4, size.h / 2 - p.y * 1.4)
          .scale(1.4)
        d3.select(svgRef.current).call(d3.zoom().transform as never, t)
      }
    }
  }

  function onBackgroundClick(): void {
    setSelId(null)
    setHoverId(null)
    setFocusType(null)
    setTraceOn(false)
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(prefersReducedMotion ? 0 : 500)
        .call(
          d3.zoom().transform as never,
          d3.zoomIdentity.translate(size.w / 2, size.h / 2).scale(1),
        )
    }
  }

  function focusOnType(t: string): void {
    setFocusType((prev) => (prev === t ? null : t))
    setSelId(null)
    setTraceOn(false)
  }

  function resetView(): void {
    setFocusType(null)
    setSelId(null)
    setHoverId(null)
    setTraceOn(false)
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(prefersReducedMotion ? 0 : 500)
        .call(
          d3.zoom().transform as never,
          d3.zoomIdentity.translate(size.w / 2, size.h / 2).scale(1),
        )
    }
  }

  function zoomBy(f: number): void {
    if (!svgRef.current) return
    d3
      .select(svgRef.current)
      .transition()
      .duration(prefersReducedMotion ? 0 : 220)
      .call(d3.zoom().scaleBy as never, f)
  }

  function onSearch(q: string): void {
    setQuery(q)
    const key = q.trim()
    if (!key || !graph) {
      setResults([])
      return
    }
    const matches = graph.nodes.filter(
      (n) =>
        n.label.includes(key) ||
        n.type.includes(key) ||
        (n.extra && JSON.stringify(n.extra).includes(key)),
    )
    matches.sort((a, b) => Number(b.label === key) - Number(a.label === key))
    setResults(matches.slice(0, 8))
  }

  function flyToNode(node: GraphNode): void {
    onNodeClick(node)
    setQuery('')
    setResults([])
  }

  /** Escape 清空搜索（combobox 约定） */
  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Escape') {
      setQuery('')
      setResults([])
    }
  }

  /** 详情面板关联行：基于后端 links 全量（含传承人/作品/类别/地域/来源） */
  const relations = useMemo(() => {
    if (!graph || !selId) return [] as { name: string; relation: string; node: GraphNode }[]
    const out: { name: string; relation: string; node: GraphNode }[] = []
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    for (const l of graph.links) {
      if (l.source === selId) {
        const other = byId.get(l.target)
        if (other) out.push({ name: other.label, relation: l.relation, node: other })
      } else if (l.target === selId) {
        const other = byId.get(l.source)
        if (other) out.push({ name: other.label, relation: l.relation, node: other })
      }
    }
    return out
  }, [graph, selId])

  function openRelation(r: { node: GraphNode }): void {
    const t = r.node.type
    if (t === 'heritage') onNavigate('knowledge', r.node.id)
    else if (t === 'region') onNavigate('map', r.node.label)
    else if (t === 'category') onNavigate('knowledge', `kw:${r.node.label}`)
    else onNavigate('knowledge')
  }

  const selectedNode = useMemo(
    () => graph?.nodes.find((n) => n.id === selId) ?? null,
    [graph, selId],
  )

  /** 寻脉链路：从当前节点沿族谱父链一路点到根（类别 → 非遗 → 传承人皆可） */
  const trace = useMemo(() => {
    if (!traceOn || !selId || !layout) return null
    const start = layout.byId.get(selId)
    if (!start) return null
    const nodeIds = new Set<string>()
    const linkKeys = new Set<string>()
    let cur: HNode | null = start
    while (cur) {
      nodeIds.add(cur.data.id)
      if (cur.parent) {
        linkKeys.add(`${cur.parent.data.id}->${cur.data.id}`)
      }
      cur = cur.parent as HNode | null
    }
    return { nodeIds, linkKeys }
  }, [traceOn, selId, layout])

  const total = graph?.nodes.length ?? 0
  const linkTotal = graph?.links.length ?? 0
  const heritageCount = useMemo(
    () => graph?.nodes.filter((n) => n.type === 'heritage').length ?? 0,
    [graph],
  )

  const activeId = selId ?? hoverId

  // 渲染状态判定（用于节点不透明度/边色）
  function nodeState(n: HNode): 'dim' | 'hood' | 'normal' {
    if (trace) return trace.nodeIds.has(n.data.id) ? 'normal' : 'dim'
    if (focusType && n.data.type !== focusType) return 'dim'
    if (activeId) return hood.has(n.data.id) ? 'hood' : 'dim'
    return 'normal'
  }

  function linkState(l: { source: HNode; target: HNode }): 'hood' | 'dim' {
    if (activeId) {
      if (l.source.data.id === activeId || l.target.data.id === activeId) return 'hood'
      return 'dim'
    }
    return 'dim'
  }

  // 径向连线生成器：LinkDatum={source,target}，NodeDatum=HNode
  const linkGen = useMemo(
    () =>
      d3
        .linkRadial<{ source: HNode; target: HNode }, HNode>()
        .angle((d) => d.x)
        .radius((d) => d.y),
    [],
  )

  return (
    <div className="graph-page">
      <header className="graph-header">
        <div className="graph-header-top">
          <h1>非遗族谱</h1>
          <span className="graph-header-sep" aria-hidden />
          <p>
            {total
              ? `${heritageCount} 项深读非遗 · 收录 ${COLLECTION_TOTAL} 项 · ${total} 节点 · ${linkTotal} 条关系`
              : '加载中…'}
          </p>
        </div>
        <div className="graph-tools">
          <div className="graph-legend">
          {(Object.keys(TYPE_LABEL) as GraphNode['type'][])
            .filter((t) => t !== 'region')
            .map((t) => (
              <button
                key={t}
                className={`graph-legend-item ${focusType === t ? 'is-active' : ''}`}
                onClick={() => focusOnType(t)}
                title={`高亮「${TYPE_LABEL[t]}」节点`}
              >
                <i style={{ background: typeColor[t] }} />
                {TYPE_LABEL[t]}
              </button>
            ))}
          {(focusType || selId) && (
            <button className="graph-reset" onClick={resetView}>
              返回全图
            </button>
          )}
        </div>
        <div className="graph-search">
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="搜项目名、地域或类别…"
            aria-label="搜索族谱节点"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls="graph-search-list"
          />
          {results.length > 0 && (
            <div className="graph-search-list" id="graph-search-list" role="listbox">
              {results.map((n) => (
                <button
                  key={n.id}
                  id={`graph-opt-${n.id}`}
                  className="graph-search-item"
                  role="option"
                  aria-selected={false}
                  onClick={() => flyToNode(n)}
                >
                  <strong>{n.label}</strong>
                  <span>
                    {TYPE_LABEL[n.type]}
                    {n.extra?.region ? ` · ${n.extra.region}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </header>

      {error && (
        <div className="graph-error" role="alert">
          <p>{error}</p>
          <button className="graph-btn graph-retry" onClick={loadGraph}>
            重试
          </button>
        </div>
      )}
      {!graph && !error && (
        <div className="graph-loading" aria-label="族谱加载中">
          <div className="skeleton graph-skeleton" />
        </div>
      )}

      <div className="graph-sky" ref={wrapRef}>
        {graph && layout && (
          <svg
            ref={svgRef}
            width={size.w}
            height={size.h}
            onClick={onBackgroundClick}
            role="application"
            aria-label="非遗族谱径向图，节点可在上方搜索框中检索并回车打开"
          >
            <g ref={gRef}>
              {/* 0. 星野：三千星尘拟全量收录，环族谱一周（静态、不参与交互） */}
              <StarField stars={dustField.stars} color={goldEmber} />
              <text
                className="graph-starfield-note"
                x={0}
                y={-(dustField.outer + 12)}
                textAnchor="middle"
                aria-hidden
              >
                三千星尘 · 各有所承
              </text>

              {/* 1. 浑天刻度环：缓慢自转的星宿背景（pointer-events 由 CSS 关闭）*/}
              <g className="graph-armillary">
                <circle r={armillary.outerR} fill="none" stroke={ringStroke} strokeWidth={0.6} />
                <circle r={80} fill="none" stroke={ringStrokeFaint} strokeWidth={0.4} />
                <circle r={160} fill="none" stroke={ringStrokeFaint} strokeWidth={0.4} />
                {armillary.ticks.map((t, i) => (
                  <line
                    key={i}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={tickStroke}
                    strokeWidth={0.6}
                  />
                ))}
                {armillary.cardinals.map((c, i) => (
                  <text
                    key={i}
                    className="graph-armillary-label"
                    x={c.x}
                    y={c.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {c.text}
                  </text>
                ))}
                {armillary.stars.map((s, i) => (
                  <circle
                    key={i}
                    cx={s.cx}
                    cy={s.cy}
                    r={0.6}
                    fill={starFill}
                    opacity={s.opacity}
                  />
                ))}
              </g>

              {/* 2. 径向薪火粒子（向心飘移，pointer-events 由 CSS 关闭）*/}
              <g className="graph-embers">{emberElements}</g>

              {/* 3. 连线：极淡墨色，邻域高亮描金；寻脉时链路描金 */}
              <g className="graph-links">
                {layout.links.map((l, i) => {
                  const s = linkState(l)
                  const d = linkGen({ source: l.source, target: l.target })
                  if (!d) return null
                  const isTrace =
                    trace?.linkKeys.has(`${l.source.data.id}->${l.target.data.id}`) ?? false
                  return (
                    <path
                      key={i}
                      d={d}
                      className={`graph-link ${isTrace ? 'is-trace' : ''} ${s === 'hood' ? 'is-hood' : ''}`}
                    />
                  )
                })}
              </g>

              {/* 3.5 墨晕涟漪：点击节点处荡开的同心圆（不参与交互） */}
              <g className="graph-ripples" aria-hidden>
                {ripples.map((r) => (
                  <g key={r.id} className="graph-ripple" transform={`translate(${r.x},${r.y})`}>
                    <circle r={0} />
                    <circle r={0} style={{ animationDelay: '0.2s' }} />
                  </g>
                ))}
              </g>

              {/* 节点：入场自中心向外渐次点亮 */}
              <g className="graph-nodes">
                {layout.nodes.map((n, ni) => {
                  const p = radialXY(n)
                  const st = nodeState(n)
                  const isMajor = n.data.type === 'heritage' || n.data.type === 'category'
                  const isSel = selId === n.data.id
                  const isHov = hoverId === n.data.id
                  const isTrace = trace?.nodeIds.has(n.data.id) ?? false
                  const color = typeColor[n.data.type]
                  // 标签显示：主节点常显，叶节点 hover/选中时显
                  const showLabel =
                    isMajor || isSel || isHov || isTrace || (st === 'hood' && n.depth > 1)
                  return (
                    <g
                      key={n.data.id}
                      transform={`translate(${p.x},${p.y})`}
                      className={`graph-node graph-node--${n.data.type} ${st} ${isTrace ? 'is-trace' : ''}`}
                      style={{
                        animationDelay: prefersReducedMotion
                          ? undefined
                          : `${Math.min(1.5, 0.35 + n.depth * 0.18 + (ni % 12) * 0.02)}s`,
                      }}
                      role="button"
                      aria-label={`${n.data.label}，${TYPE_LABEL[n.data.type]}`}
                      tabIndex={-1}
                      onMouseEnter={() => onNodeHover(n.data)}
                      onMouseLeave={() => onNodeHover(null)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNodeClick(n.data)
                      }}
                    >
                      <circle
                        r={isMajor ? (n.data.type === 'category' ? 7.2 : 5.8) : 3.6}
                        fill={color}
                        stroke={
                          isSel ? selStroke : isHov ? glowStroke : 'none'
                        }
                        strokeWidth={isSel ? 1.6 : isHov ? 1.1 : 0}
                      />
                      {showLabel && (
                        <text
                          className={`graph-label ${
                            n.data.type === 'category'
                              ? 'graph-label--cat'
                              : n.data.type === 'heritage'
                                ? 'graph-label--h'
                                : 'graph-label--leaf'
                          }`}
                          textAnchor={
                            Math.abs(p.x) < 6 ? 'middle' : p.x > 0 ? 'start' : 'end'
                          }
                          x={p.x > 0 ? 9 : p.x < 0 ? -9 : 0}
                          dy={
                            Math.abs(p.x) < 6 ? (p.y > 0 ? 16 : -10) : '0.32em'
                          }
                        >
                          {n.data.label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            </g>
          </svg>
        )}
      </div>

      <div className="graph-zoom">
        <button
          onClick={() => zoomBy(1.4)}
          title="放大"
          aria-label="放大"
          disabled={!graph || !!error}
        >
          ＋
        </button>
        <button
          onClick={() => zoomBy(1 / 1.4)}
          title="缩小"
          aria-label="缩小"
          disabled={!graph || !!error}
        >
          －
        </button>
        <button
          onClick={resetView}
          title="复位视图"
          aria-label="复位"
          disabled={!graph || !!error}
        >
          ⤢
        </button>
      </div>

      {selId && selectedNode && (
        <div className="graph-detail">
          <div className="graph-detail-head">
            <strong>{selectedNode.label}</strong>
            <span
              className="graph-detail-type"
              style={{ color: typeColor[selectedNode.type] }}
            >
              {TYPE_LABEL[selectedNode.type]}
            </span>
            <button
              className="graph-close"
              onClick={() => {
                setSelId(null)
                setDetail(null)
                setTraceOn(false)
              }}
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          <div className="graph-detail-info">
            {selectedNode.type === 'heritage' ? (
              detail ? (
                <>
                  <p className="graph-detail-desc">{detail.description}</p>
                  <span>
                    {detail.category} · {detail.region} · {detail.level}
                  </span>
                </>
              ) : detailError ? (
                <div className="graph-detail-retry">
                  <p>简介加载失败</p>
                  <button
                    className="graph-btn"
                    onClick={() => loadDetail(selectedNode.id)}
                  >
                    重试
                  </button>
                </div>
              ) : (
                <p className="graph-loading-line">简介加载中…</p>
              )
            ) : (
              <>
                <p>
                  {selectedNode.type === 'category' &&
                    `十大类之一${selectedNode.extra?.total ? `，全国在册 ${selectedNode.extra.total} 项` : ''}。`}
                  {selectedNode.type === 'region' &&
                    `省级行政区${selectedNode.extra?.total ? `，在册 ${selectedNode.extra.total} 项` : ''}。`}
                  {selectedNode.type === 'person' && '代表性传承人。'}
                  {selectedNode.type === 'work' && '代表作品。'}
                  {selectedNode.type === 'source' &&
                    (selectedNode.extra?.publisher
                      ? `出处 · ${selectedNode.extra.publisher}`
                      : '知识出处。')}
                </p>
                {selectedNode.extra?.url && (
                  <span style={{ wordBreak: 'break-all' }}>{selectedNode.extra.url}</span>
                )}
              </>
            )}
          </div>

          <div className="graph-detail-actions">
            {layout?.byId.has(selectedNode.id) && selectedNode.id !== '__root' && (
              <button
                className={`graph-btn ${traceOn ? 'primary' : ''}`}
                onClick={() => setTraceOn((t) => !t)}
                title="点亮此节点到族谱根部的传承脉络"
              >
                {traceOn ? '收起脉络' : '寻脉'}
              </button>
            )}
            {selectedNode.type === 'heritage' && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('knowledge', selectedNode.id)}
              >
                查看知识库详情 →
              </button>
            )}
            {selectedNode.type === 'heritage' && selectedNode.extra?.region && (
              <button
                className="graph-btn"
                onClick={() => onNavigate('map', extractProvince(selectedNode.extra!.region))}
              >
                去非遗地图
              </button>
            )}
            {selectedNode.type === 'category' && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('knowledge', `kw:${selectedNode.label}`)}
              >
                去知识库筛选 →
              </button>
            )}
            {selectedNode.type === 'region' && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('map', selectedNode.label)}
              >
                去非遗地图 →
              </button>
            )}
          </div>

          {relations.length > 0 && (
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
