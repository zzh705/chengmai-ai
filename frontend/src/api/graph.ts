/** 知识图谱接口（GET /api/graph, GET /api/graph/{id}） */

export interface GraphNode {
  id: string
  label: string
  type: 'heritage' | 'category' | 'region' | 'person' | 'work'
}

export interface GraphLink {
  source: string
  target: string
  relation: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export async function fetchFullGraph(): Promise<GraphData> {
  const resp = await fetch('/api/graph')
  if (!resp.ok) throw new Error(`图谱加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as GraphData
}

export async function fetchItemGraph(itemId: string): Promise<GraphData> {
  const resp = await fetch(`/api/graph/${itemId}`)
  if (!resp.ok) throw new Error(`子图加载失败：HTTP ${resp.status}`)
  return (await resp.json()) as GraphData
}
