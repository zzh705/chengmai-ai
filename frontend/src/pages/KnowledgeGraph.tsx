import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { fetchFullGraph, fetchItemGraph, type GraphData, type GraphNode } from '../api/graph'
import '../styles/graph.css'

const TYPE_COLOR: Record<string, string> = {
  heritage: '#e8c56b',
  category: '#b03a2e',
  region: '#4a9d8f',
  person: '#c98ad4',
  work: '#8fbf6f',
}

const TYPE_LABEL: Record<string, string> = {
  heritage: '非遗项目',
  category: '类别',
  region: '地域',
  person: '传承人',
  work: '作品',
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}

/** D3 力模拟会把 source/target 从字符串原地替换成节点对象，故声明为联合类型 */
interface SimLink {
  source: string | SimNode
  target: string | SimNode
  relation: string
}

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [data, setData] = useState<GraphData | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFullGraph().then(setData).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!data || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }))
    const links: SimLink[] = data.links.map((l) => ({ ...l }))

    const sim = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => (d as SimNode).id)
          .distance(90),
      )
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(28))

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'g-link')
      .attr('stroke', '#4a4137')

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'g-node')
      .call(
        d3
          .drag<any, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
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

    node.on('click', async (_event, d) => {
      setSelected(d)
      if (d.type === 'heritage') {
        setFocusId(d.id)
        try {
          const sub = await fetchItemGraph(d.id)
          setData(sub)
        } catch {
          /* 子图加载失败时保持当前图 */
        }
      }
    })

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      sim.stop()
    }
  }, [data])

  async function resetView() {
    setFocusId(null)
    setSelected(null)
    setData(await fetchFullGraph())
  }

  return (
    <div className="graph-page">
      <header className="graph-header">
        <h1>非遗知识图谱</h1>
        <p>点击非遗项目节点可聚焦其关系网络 · 拖拽节点调整布局</p>
        <div className="graph-legend">
          {Object.entries(TYPE_LABEL).map(([type, label]) => (
            <span key={type}>
              <i style={{ background: TYPE_COLOR[type] }} />
              {label}
            </span>
          ))}
          {focusId && (
            <button className="graph-reset" onClick={resetView}>
              ↺ 返回全图
            </button>
          )}
        </div>
      </header>
      {error && <div className="graph-error">{error}</div>}
      {!data && !error && <div className="graph-loading">图谱加载中…</div>}
      <svg ref={svgRef} className="graph-svg" />
      {selected && (
        <div className="graph-detail">
          <strong>{selected.label}</strong>
          <span>{TYPE_LABEL[selected.type]}</span>
        </div>
      )}
    </div>
  )
}
