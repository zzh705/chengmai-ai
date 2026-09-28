import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import Cover from '../components/Cover'
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

/** category 形如"传统美术 · 刺绣"，取首段作大类 */
const catOf = (c: string) => c.split(' · ')[0]

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

export default function MapPage({ onNavigate, openRegion }: Props) {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null)
  const [list, setList] = useState<HeritageSummary[]>([])
  const [hover, setHover] = useState<string | null>(null)
  // 外部导航带参进入（如知识图谱地域节点）→ 初始即选中该省；页面切换会重挂载
  const [selected, setSelected] = useState<string | null>(openRegion ?? null)
  const [category, setCategory] = useState('全部')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/china.json')
      .then((r) => r.json())
      .then((g) => setGeo(fixWinding(g)))
      .catch((e) => setError(`地图加载失败：${e.message}`))
    fetchHeritageList().then(setList).catch((e) => setError(e.message))
  }, [])

  // 大类分布（全局，不受筛选影响）：按计数降序
  const catStats = useMemo(() => {
    const m = new Map<string, number>()
    list.forEach((h) => m.set(catOf(h.category), (m.get(catOf(h.category)) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [list])

  const filtered = useMemo(
    () => (category === '全部' ? list : list.filter((h) => catOf(h.category) === category)),
    [list, category],
  )

  const provinces = useMemo<Province[]>(() => {
    if (!geo) return []
    const projection = geoMercator().fitSize([W, H], geo as never)
    const path = geoPath(projection)
    return geo.features
      .map((f) => {
        const full = f.properties?.name ?? ''
        const key = provKey(full)
        // 含「全国」的流布项不计入单省（与首页地域聚合同口径）
        const items = key
          ? filtered.filter((h) => h.region.includes(key) && !h.region.includes('全国'))
          : []
        return {
          name: full,
          key,
          path: path(f as never) ?? '',
          count: items.length,
          items,
        }
      })
      // path 为空的跳过；key 为空的（如国界线 JD 要素，name=''）会因 includes('') 恒真吞掉全部项目，必须剔除
      .filter((p) => p.path && p.key)
  }, [geo, filtered])

  const maxCount = Math.max(1, ...provinces.map((p) => p.count))
  const covered = provinces.filter((p) => p.count > 0).length
  // 排行榜：Top 8（受当前筛选影响，点击即选中该省）
  const ranking = [...provinces]
    .filter((p) => p.count > 0)
    // 次级键按省名排序，保证与首页 TOP5 同分时顺序一致
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
    .slice(0, 8)

  // 选中兼容：图谱地域节点可能是"江苏省苏州市"这类全称，用省 key 前缀匹配
  const selectedProv = provinces.find(
    (p) => p.key === selected || (selected !== null && selected.startsWith(p.key)),
  )
  const isSelected = (p: Province) =>
    p.key === selected || (selected !== null && selected.startsWith(p.key))
  const hoverProv = hover ? provinces.find((p) => p.name === hover) : null

  // 热力色阶：0 档灰，1..5 档红色渐深
  const fillOf = (p: Province) =>
    p.count > 0
      ? `rgba(176, 58, 46, ${0.3 + (0.7 * p.count) / maxCount})`
      : '#241f1b'

  return (
    <div className="map-page">
      <header className="map-header">
        <h1>非遗地图</h1>
        <p>按地域探索知识库中的非遗项目，颜色越深代表项目越多 · 点击省份查看详情</p>
      </header>

      {error && <div className="map-error">{error}</div>}

      {/* 全局统计条 */}
      <div className="map-stats">
        <div className="map-stat">
          <em>{list.length}</em>
          <span>收录项目</span>
        </div>
        <div className="map-stat">
          <em>{covered}</em>
          <span>覆盖省级行政区</span>
        </div>
        <div className="map-stat">
          <em>{catStats.length}</em>
          <span>非遗大类</span>
        </div>
        <div className="map-stat">
          <em>{list.filter((h) => h.region.includes('全国')).length}</em>
          <span>全国流布项目</span>
        </div>
      </div>

      {/* 类别筛选 */}
      <div className="map-filters">
        {[['全部', list.length] as const, ...catStats].map(([c, n]) => (
          <button
            key={c}
            className={category === c ? 'active' : ''}
            onClick={() => setCategory(c)}
          >
            {c} <em>{n}</em>
          </button>
        ))}
      </div>

      <div className="map-main">
        <div className="map-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="map-svg">
            {provinces.map((p, i) => (
              <path
                key={p.name}
                d={p.path}
                className={`map-prov ${isSelected(p) ? 'is-selected' : ''} ${
                  p.count > 0 ? 'has-items' : 'no-data'
                }`}
                style={{
                  fill: fillOf(p),
                  animationDelay: `${i * 35}ms`,
                }}
                onMouseEnter={() => setHover(p.name)}
                onMouseLeave={() => setHover(null)}
                onClick={() => p.count > 0 && setSelected(isSelected(p) ? null : p.key)}
              >
                <title>{`${p.name}：${p.count} 项`}</title>
              </path>
            ))}
          </svg>

          {/* 色阶图例 */}
          <div className="map-legend">
            <span className="map-legend-label">项目密度</span>
            <span className="map-scale" aria-hidden>
              <i style={{ background: '#241f1b' }} />
              <i style={{ background: 'rgba(176,58,46,0.3)' }} />
              <i style={{ background: 'rgba(176,58,46,0.475)' }} />
              <i style={{ background: 'rgba(176,58,46,0.65)' }} />
              <i style={{ background: 'rgba(176,58,46,0.825)' }} />
              <i style={{ background: 'rgba(176,58,46,1)' }} />
            </span>
            <span className="map-legend-label">
              0 → {maxCount} 项
            </span>
            <span className="map-legend-note">灰色 = 暂无收录</span>
          </div>

          {hoverProv && (
            <div className="map-tip">
              <strong>{hoverProv.name}</strong>
              <span>
                {hoverProv.count > 0
                  ? `${hoverProv.count} 项${hoverProv.items[0] ? ` · 代表：${hoverProv.items[0].name}` : ''}`
                  : '暂无收录项目'}
              </span>
            </div>
          )}
        </div>

        {/* 右侧数据栏：省份排行 + 类别分布 */}
        <aside className="map-side">
          <h3>省份排行</h3>
          <ul className="map-rank">
            {ranking.map((p) => (
              <li
                key={p.key}
                className={isSelected(p) ? 'active' : ''}
                onClick={() => setSelected(isSelected(p) ? null : p.key)}
              >
                <span className="rank-name">{p.name.replace(/(省|市)$/, '')}</span>
                <span className="rank-bar">
                  <i style={{ width: `${(p.count / maxCount) * 100}%` }} />
                </span>
                <em>{p.count}</em>
              </li>
            ))}
          </ul>

          <h3>类别分布</h3>
          <div className="map-cats">
            {catStats.map(([c, n]) => (
              <div
                key={c}
                className={`map-cat ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(category === c ? '全部' : c)}
                title="点击筛选该类别"
              >
                <span>{c}</span>
                <span className="rank-bar">
                  <i style={{ width: `${(n / list.length) * 100}%` }} />
                </span>
                <em>{n}</em>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* 选中省份面板 */}
      <section className="map-panel">
        <h2>
          {selectedProv
            ? `${selectedProv.name} · ${selectedProv.count} 项`
            : '点击省份查看该地非遗'}
        </h2>
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
              <Cover item={it} className="map-item-img" />
              <div className="map-item-txt">
                <strong>{it.name}</strong>
                <span>{it.category}</span>
                <span>{it.region}</span>
              </div>
            </div>
          ))}
        </div>
        {selectedProv && selectedProv.items.length > 0 && (
          <button className="map-all" onClick={() => onNavigate('knowledge', `kw:${selectedProv.key}`)}>
            在知识库中查看「{selectedProv.key}」全部项目 →
          </button>
        )}
      </section>
    </div>
  )
}
