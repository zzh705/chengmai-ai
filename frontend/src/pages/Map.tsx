import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import '../styles/map.css'

interface Props {
  onNavigate: (page: string, query?: string) => void
  /** 外部导航带参：省份 key，进入页面时自动选中（如知识图谱的地域节点） */
  openRegion?: string
}

interface Province {
  name: string
  key: string
  path: string
  count: number
  items: HeritageSummary[]
}

/** 省级名称归一：陕西省→陕西、广西壮族自治区→广西、香港特别行政区→香港 */
function provKey(name: string): string {
  return name
    .replace(/(维吾尔|壮族|回族)?自治区$/, '')
    .replace(/(省|市)$/, '')
    .replace(/特别行政区$/, '')
}

const W = 960
const H = 720

/**
 * d3-geo 按球面绕向解释多边形：GeoJSON 规范的逆时针外环会被当成"除该省以外的
 * 全世界"，导致每个省都画出全图边框（整页被涂红）。统一反转环向即可正常渲染。
 */
function fixWinding(geo: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  for (const f of geo.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'Polygon') {
      g.coordinates = g.coordinates.map((ring) => ring.slice().reverse())
    } else if (g.type === 'MultiPolygon') {
      g.coordinates = g.coordinates.map((poly) => poly.map((ring) => ring.slice().reverse()))
    }
  }
  return geo
}

export default function Map({ onNavigate, openRegion }: Props) {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null)
  const [list, setList] = useState<HeritageSummary[]>([])
  const [hover, setHover] = useState<string | null>(null)
  // 外部导航带参进入（如知识图谱地域节点）→ 初始即选中该省；页面切换会重挂载
  const [selected, setSelected] = useState<string | null>(openRegion ?? null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/china.json')
      .then((r) => r.json())
      .then((g) => setGeo(fixWinding(g)))
      .catch((e) => setError(`地图加载失败：${e.message}`))
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
  }, [])

  const provinces = useMemo<Province[]>(() => {
    if (!geo) return []
    const projection = geoMercator().fitSize([W, H], geo as never)
    const path = geoPath(projection)
    return geo.features
      .map((f) => {
        const full = f.properties?.name ?? ''
        const key = provKey(full)
        const items = list.filter((h) => h.region.includes(key))
        return {
          name: full,
          key,
          path: path(f as never) ?? '',
          count: items.length,
          items,
        }
      })
      .filter((p) => p.path)
  }, [geo, list])

  const maxCount = Math.max(1, ...provinces.map((p) => p.count))
  // 选中兼容：图谱地域节点可能是"江苏省苏州市"这类全称，用省 key 前缀匹配
  const selectedProv = provinces.find(
    (p) => p.key === selected || (selected !== null && selected.startsWith(p.key)),
  )
  const isSelected = (p: Province) =>
    p.key === selected || (selected !== null && selected.startsWith(p.key))

  return (
    <div className="map-page">
      <header className="map-header">
        <h1>非遗地图</h1>
        <p>按地域探索知识库中的非遗项目，颜色越深代表项目越多</p>
      </header>

      {error && <div className="map-error">{error}</div>}

      <div className="map-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="map-svg">
          {provinces.map((p, i) => (
            <path
              key={p.name}
              d={p.path}
              className={`map-prov ${isSelected(p) ? 'is-selected' : ''} ${
                p.count > 0 ? 'has-items' : ''
              }`}
              style={{
                fill:
                  p.count > 0
                    ? `rgba(176, 58, 46, ${0.3 + (0.7 * p.count) / maxCount})`
                    : '#241f1b',
                animationDelay: `${i * 35}ms`,
              }}
              onMouseEnter={() => setHover(p.name)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setSelected(isSelected(p) ? null : p.key)}
            >
              <title>{`${p.name}：${p.count} 项`}</title>
            </path>
          ))}
        </svg>

        <div className="map-legend">
          <span className="map-dot low" /> 无数据
          <span className="map-dot high" /> 项目多
        </div>

        {hover && (
          <div className="map-tip">{hover}</div>
        )}
      </div>

      {/* 选中省份面板 */}
      <section className="map-panel">
        <h2>{selectedProv ? `📍 ${selectedProv.name}` : '👆 点击省份查看该地非遗'}</h2>
        {selectedProv && selectedProv.items.length === 0 && (
          <p className="map-empty">该省份暂无收录项目，去看看别的地方吧</p>
        )}
        <div className="map-items">
          {selectedProv?.items.map((it) => (
            <div
              key={it.id}
              className="map-item"
              onClick={() => onNavigate('knowledge', it.id)}
            >
              <strong>{it.name}</strong>
              <span>
                {it.category} · {it.region}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
