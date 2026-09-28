import { useState } from 'react'

interface CoverItem {
  image: string
  name: string
}

/** 图片封面：加载失败时回退为渐变字卡（样式在 index.css 的 .cover-fallback） */
export default function Cover({ item, className }: { item: CoverItem; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`${className} cover-fallback`} aria-hidden>
        {item.name.slice(0, 1)}
      </div>
    )
  }
  return (
    <img
      className={className}
      src={item.image}
      alt={item.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
