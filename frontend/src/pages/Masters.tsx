import { useEffect, useRef, useState } from 'react'
import { MASTERS, MASTER_MAP, type Master } from '../data/masters'
import '../styles/masters.css'

interface Props {
  /** 初始选中的名家 id（首页「查看详情」跳转携带） */
  openParam?: string
  onNavigate: (target: string, param?: string) => void
}

/** 印章字：取姓名末字（红线女→女），谭鑫培→培 */
function sealOf(name: string): string {
  return name[name.length - 1]
}

export default function Masters({ openParam, onNavigate }: Props) {
  const [activeId, setActiveId] = useState<string | null>(openParam ?? null)
  const active: Master | undefined = activeId ? MASTER_MAP.get(activeId) : undefined
  // 详情容器：打开后接收焦点
  const detailRef = useRef<HTMLElement>(null)
  // 记住进入详情前的卡片，返回时把焦点还回去
  const lastIdRef = useRef<string | null>(null)

  // 列表/详情同容器切换：进入详情回到手卷顶部并接管焦点；返回时焦点还给对应卡片
  useEffect(() => {
    document.querySelector<HTMLElement>('.ms-page')?.scrollTo({ top: 0 })
    if (active) {
      lastIdRef.current = active.id
      detailRef.current?.focus({ preventScroll: true })
    } else if (lastIdRef.current) {
      const id = lastIdRef.current
      lastIdRef.current = null
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(`.ms-card-img[data-id="${id}"]`)
          ?.focus({ preventScroll: true })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (active) {
    const idx = MASTERS.findIndex((m) => m.id === active.id)
    const next = MASTERS[(idx + 1) % MASTERS.length]
    return (
      <div className="ms-page">
        <button className="ms-back" onClick={() => setActiveId(null)}>
          ← 回到名家录
        </button>

        <article className="ms-detail" tabIndex={-1} ref={detailRef}>
          <div className="ms-detail-portrait">
            <img
              src={active.image}
              alt={`${active.name}历史影像`}
              loading="eager"
              decoding="async"
            />
            <span className="ms-detail-seal" aria-hidden>
              {sealOf(active.name)}
            </span>
          </div>
          <div className="ms-detail-main">
            <span className="ms-detail-art">{active.art}</span>
            <h1>{active.name}</h1>
            <p className="ms-detail-meta">
              {active.years} · {active.title}
              {active.alias ? ` · ${active.alias}` : ''}
            </p>
            <p className="ms-detail-hook">「{active.hook}」</p>
            <div className="ms-detail-bio">
              {active.bio.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <section className="ms-stories">
              <h3 className="ms-section-h">
                <span className="ms-section-dot" aria-hidden />
                艺林故事
              </h3>
              {active.stories.map((s, i) => (
                <article className="ms-story" key={i}>
                  <span className="ms-story-seal" aria-hidden>
                    {i === 0 ? '其一' : '其二'}
                  </span>
                  <p>{s}</p>
                </article>
              ))}
            </section>

            <section className="ms-timeline">
              <h3 className="ms-section-h">
                <span className="ms-section-dot" aria-hidden />
                生平年表
              </h3>
              <ol>
                {active.timeline.map((t, i) => (
                  <li key={i} style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
                    <span className="ms-tl-year">{t.year}</span>
                    <span className="ms-tl-dot" aria-hidden />
                    <span className="ms-tl-event">{t.event}</span>
                  </li>
                ))}
              </ol>
            </section>

            <h3 className="ms-detail-works-h">{active.worksLabel ?? '代表剧目'}</h3>
            <div className="ms-detail-works">
              {active.works.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            {active.quote && (
              <blockquote className="ms-detail-quote">
                <span className="ms-quote-mark" aria-hidden>
                  「
                </span>
                {active.quote}
              </blockquote>
            )}
            <div className="ms-detail-actions">
              <button
                className="ms-btn-primary"
                onClick={() => onNavigate('chat', `给我讲讲${active.name}的故事`)}
              >
                向承脉 AI 问起{active.name}
              </button>
              <button className="ms-btn-ghost" onClick={() => setActiveId(next.id)}>
                下一位：{next.name} →
              </button>
            </div>
            <p className="ms-credit">历史影像 · {active.credit} · {active.license}</p>
          </div>
        </article>
      </div>
    )
  }

  return (
    <div className="ms-page">
      <header className="ms-header">
        <h1>名家风采</h1>
        <span className="ms-subtitle">开宗立派 · 先立其源</span>
        <p>
          三千余项非遗背后，是千千万万双做活的手。我们无从一一立传，便先立起这十六位源头之人：他们开一派之宗，把一门手艺唱成了、做成了、写成了各自时代的记忆。十六位皆有可确证的公版影像或历史画像，请先生们本人出场。星河纵有万千，先认得北斗。
        </p>
      </header>

      <div className="ms-grid">
        {MASTERS.map((m, i) => (
          <article
            key={m.id}
            className="ms-card"
            style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
          >
            <button
              className="ms-card-img"
              data-id={m.id}
              onClick={() => setActiveId(m.id)}
              aria-label={`查看 ${m.name} 详情`}
            >
              <img src={m.image} alt={`${m.name}历史影像`} loading="lazy" decoding="async" />
              <span className="ms-card-seal" aria-hidden>
                {sealOf(m.name)}
              </span>
              <span className="ms-card-veil" aria-hidden />
            </button>
            <div className="ms-card-txt">
              <span className="ms-card-art">{m.art}</span>
              <h2>{m.name}</h2>
              <p className="ms-card-meta">
                {m.years} · {m.title}
              </p>
              <p className="ms-card-hook">{m.hook}</p>
              <button className="ms-card-cta" onClick={() => setActiveId(m.id)}>
                查看详情
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
