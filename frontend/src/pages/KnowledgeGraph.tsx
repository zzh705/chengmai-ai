import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { fetchFullGraph, fetchItemGraph, type GraphData, type GraphNode } from '../api/graph'
import { fetchHeritageDetail, type HeritageDetail } from '../api/heritage'
import '../styles/graph.css'

const TYPE_COLOR: Record<string, string> = {
  heritage: '#e8c56b',
  category: '#b03a2e',
  region: '#4a9d8f',
  person: '#c98ad4',
  work: '#8fbf6f',
  source: '#7aa7e0',
}

const TYPE_LABEL: Record<string, string> = {
  heritage: '非遗项目',
  category: '类别',
  region: '地域',
  person: '传承人',
  work: '作品',
  source: '资料来源',
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}

/** D3 力模拟会把 source/target 从字符串原地替换成节点对象，故声明为联合类型 */
interface SimLink {
  source: string | SimNode
  target: string | SimNode
  relation: string
}

interface Props {
  onNavigate: (page: string, param?: string) => void
}

export default function KnowledgeGraph({ onNavigate }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [data, setData] = useState<GraphData | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [detail, setDetail] = useState<HeritageDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  /** 由 d3 effect 注册：同步节点选中光环（面板内点击也会高亮图上节点） */
  const ringRef = useRef<(id: string | null) => void>(() => {})
  /** 当前选中节点 id：effect 内读它而非闭包里的 selected，避免 exhaustive-deps */
  const selectedIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetchFullGraph().then(setData).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!data || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const nodes: SimNode[] = data.nodes.map((n, i) => ({
      ...n,
      // 确定性初始位置：全部落在视口中心附近，避免从 (0,0) 散开跑出画布
      x: width / 2 + Math.cos(i * 2.4) * (40 + (i % 5) * 26),
      y: height / 2 + Math.sin(i * 2.4) * (40 + (i % 5) * 26),
    }))
    const links: SimLink[] = data.links.map((l) => ({ ...l }))

    const rootG = svg.append('g')

    // 滚轮缩放 + 拖空白平移（节点自身拖拽不受影响）
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 3])
      .on('zoom', (event) => rootG.attr('transform', event.transform))
    svg.call(zoom).on('dblclick.zoom', null)

    const sim = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => (d as SimNode).id)
          .distance(80),
      )
      .force('charge', d3.forceManyBody().strength(-140).distanceMax(420))
      .force('center', d3.forceCenter(width / 2, height / 2))
      // 向心力把节点拉回视口内，防止长跑出画布
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .force('collide', d3.forceCollide(26))

    const link = rootG
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'g-link')
      .attr('stroke', '#4a4137')

    // 聚焦子图时显示关系标签（全图 240 条边会拥挤，仅聚焦时展示）
    const relLabel = rootG
      .append('g')
      .selectAll('text')
      .data(focusId ? links : [])
      .join('text')
      .attr('class', 'g-relation')
      .text((d) => d.relation)

    // 拖动后会紧跟一次 click，用 moved 标记把误触吃掉
    let moved = false

    const node = rootG
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', (d) => `g-node g-${d.type}`)
      .call(
        d3
          .drag<any, SimNode>()
          .on('start', (event, d) => {
            moved = false
            event.sourceEvent?.stopPropagation() // 别让底下 zoom 跟着平移
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            moved = true
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    node
      .append('circle')
      .attr('r', (d) => (d.type === 'heritage' ? 16 : 10))
      .attr('fill', (d) => TYPE_COLOR[d.type] ?? '#999')
      .attr('stroke', '#14110f')
      .attr('stroke-width', 1.5)

    node
      .append('text')
      .text((d) => d.label)
      .attr('dy', (d) => (d.type === 'heritage' ? 30 : 22))
      .attr('text-anchor', 'middle')
      .attr('class', 'g-label')
      // 全图只标非遗项目，其余节点标签在聚焦/选中时可读，避免 180 个标签糊成一片
      .style('display', (d) => (focusId || d.type === 'heritage' ? null : 'none'))

    node.on('click', (_event, d) => {
      if (moved) return // 拖动结束的误触，不响应
      selectNode(d)
    })

    // 注册选中光环同步：面板内点击也能点亮对应节点
    ringRef.current = (id) => node.classed('g-selected', (d) => d.id === id)
    ringRef.current(selectedIdRef.current)

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)
      relLabel
        .attr('x', (d) => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr('y', (d) => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2 - 4)
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      sim.stop()
      ringRef.current = () => {}
    }
  }, [data, focusId])

  /** 统一的节点选中入口（d3 点击与面板点击共用） */
  function selectNode(d: GraphNode) {
    selectedIdRef.current = d.id
    setSelected(d)
    setDetail(null)
    if (d.type === 'heritage') {
      fetchHeritageDetail(d.id).then(setDetail).catch(() => setDetail(null))
    }
    ringRef.current(d.id)
  }

  function deselect() {
    selectedIdRef.current = null
    setSelected(null)
    setDetail(null)
    ringRef.current(null)
  }

  async function focusNode(id: string) {
    if (busy) return
    setBusy(true)
    try {
      setFocusId(id)
      setData(await fetchItemGraph(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '子图加载失败')
    } finally {
      setBusy(false)
    }
  }

  async function resetView() {
    setFocusId(null)
    deselect()
    setData(await fetchFullGraph())
  }

  /** 当前视图中与选中节点相连的关系 */
  const relations: { name: string; relation: string; other: GraphNode }[] = []
  if (selected && data) {
    for (const l of data.links) {
      if (l.source === selected.id) {
        const other = data.nodes.find((n) => n.id === l.target)
        if (other) relations.push({ name: other.label, relation: l.relation, other })
      } else if (l.target === selected.id) {
        const other = data.nodes.find((n) => n.id === l.source)
        if (other) relations.push({ name: other.label, relation: l.relation, other })
      }
    }
  }
  const heritageRels = relations.filter((r) => r.other.type === 'heritage')

  /** 关联行点击：项目→知识库详情，地域→地图，类别→知识库筛选，其余→图上选中 */
  function openRelation(r: { other: GraphNode }) {
    const t = r.other
    if (t.type === 'heritage') onNavigate('knowledge', t.id)
    else if (t.type === 'region') onNavigate('map', t.label)
    else if (t.type === 'category') onNavigate('knowledge', `kw:${t.label}`)
    else selectNode(t)
  }

  const extra = selected?.extra

  return (
    <div className="graph-page">
      <header className="graph-header">
        <h1>非遗知识图谱</h1>
        <p>点击节点查看内容 · 主按钮进入对应页面 · 拖拽调整布局 · 滚轮缩放、拖空白平移</p>
        <div className="graph-legend">
          {Object.entries(TYPE_LABEL).map(([type, label]) => (
            <span key={type}>
              <i style={{ background: TYPE_COLOR[type] }} />
              {label}
            </span>
          ))}
          {focusId && (
            <button className="graph-reset" onClick={resetView}>
              返回全图
            </button>
          )}
        </div>
        {focusId && (
          <div className="graph-focus-bar">
            聚焦中：{data?.nodes.find((n) => n.id === focusId)?.label ?? focusId} 的关系网络
          </div>
        )}
      </header>
      {error && <div className="graph-error">{error}</div>}
      {!data && !error && <div className="graph-loading">图谱加载中…</div>}
      <svg ref={svgRef} className="graph-svg" />

      {selected && (
        <div className="graph-detail">
          <div className="graph-detail-head">
            <strong>{selected.label}</strong>
            <span className="graph-detail-type" style={{ color: TYPE_COLOR[selected.type] }}>
              {TYPE_LABEL[selected.type]}
            </span>
            <button className="graph-close" onClick={deselect}>
              ×
            </button>
          </div>

          {/* 每类节点都有内容展示 */}
          {selected.type === 'heritage' && (
            <div className="graph-detail-info">
              {detail ? (
                <>
                  <p>{detail.description.slice(0, 140)}…</p>
                  <span>
                    {detail.category} · {detail.region} · {detail.level}
                  </span>
                </>
              ) : (
                <p className="graph-loading-line">简介加载中…</p>
              )}
            </div>
          )}
          {selected.type === 'category' && (
            <div className="graph-detail-info">
              <p>该类别下收录非遗项目 {heritageRels.length} 项，点下方项目名直达知识库详情。</p>
            </div>
          )}
          {selected.type === 'region' && (
            <div className="graph-detail-info">
              <p>该地域收录非遗 {heritageRels.length} 项，可去地图查看分布，或点下方项目直达详情。</p>
            </div>
          )}
          {selected.type === 'person' && (
            <div className="graph-detail-info">
              <p>代表性传承人，关联非遗项目 {heritageRels.length} 项，点击查看完整介绍。</p>
            </div>
          )}
          {selected.type === 'work' && (
            <div className="graph-detail-info">
              <p>代表性作品，出自以下非遗项目：</p>
            </div>
          )}
          {selected.type === 'source' && (
            <div className="graph-detail-info">
              <p>{extra?.title ?? '资料来源'}</p>
              <span>
                {extra?.publisher}
                {extra?.reliability ? ` · 可信度：${extra.reliability}` : ''}
              </span>
            </div>
          )}

          {/* 主操作：进入对应页面 */}
          <div className="graph-detail-actions">
            {selected.type === 'heritage' && (
              <>
                <button
                  className="graph-btn primary"
                  onClick={() => onNavigate('knowledge', selected.id)}
                >
                  进入知识库详情 →
                </button>
                {focusId !== selected.id && (
                  <button className="graph-btn" onClick={() => focusNode(selected.id)}>
                    聚焦子图
                  </button>
                )}
              </>
            )}
            {selected.type === 'category' && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('knowledge', `kw:${selected.label}`)}
              >
                去知识库筛选 →
              </button>
            )}
            {selected.type === 'region' && (
              <button
                className="graph-btn primary"
                onClick={() => onNavigate('map', selected.label)}
              >
                去非遗地图 →
              </button>
            )}
            {(selected.type === 'person' || selected.type === 'work') && (
              <button className="graph-btn primary" onClick={() => onNavigate('knowledge')}>
                去知识库浏览 →
              </button>
            )}
            {selected.type === 'source' && extra?.url && (
              <a
                className="graph-btn primary graph-btn-link"
                href={extra.url}
                target="_blank"
                rel="noreferrer"
              >
                打开原文 →
              </a>
            )}
          </div>

          {/* 关联列表：全部可点击跳转 */}
          <div className="graph-relations">
            <em>关联 {relations.length} 项 · 点击可跳转</em>
            {relations.slice(0, 10).map((r, i) => (
              <button
                key={i}
                className="graph-relation-line"
                onClick={() => openRelation(r)}
                title={
                  r.other.type === 'heritage'
                    ? '进入知识库详情'
                    : r.other.type === 'region'
                      ? '去非遗地图'
                      : r.other.type === 'category'
                        ? '去知识库筛选'
                        : '在图谱中选中'
                }
              >
                <span className="graph-relation-tag">{r.relation}</span>
                {r.name}
                <span className="graph-relation-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
