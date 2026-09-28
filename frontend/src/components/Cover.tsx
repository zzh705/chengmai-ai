import { useState } from 'react'

interface CoverItem {
  image: string
  name: string
}

/**
 * 图片封面三级回退：Commons 实拍图 → 程序生成纹样字卡（{id}.gen.svg）→ 渐变字卡。
 * 字卡由 scripts/gen_wordcards.py 生成，保证每个条目都有封面且不含伪造信息。
 */
export default function Cover({ item, className }: { item: CoverItem; className: string }) {
  const [stage, setStage] = useState(0)
  if (stage > 1) {
    return (
      <div className={`${className} cover-fallback`} aria-hidden>
        {item.name.slice(0, 1)}
      </div>
    )
  }
  const src = stage === 0 ? item.image : item.image.replace(/\.jpg$/, '.gen.svg')
  return (
    <img
      className={className}
      src={src}
      alt={item.name}
      loading="lazy"
      onError={() => setStage((s) => s + 1)}
    />
  )
}
