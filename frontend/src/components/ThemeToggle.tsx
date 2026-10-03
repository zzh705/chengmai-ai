import { flashThemeTransition, toggleTheme, useTheme } from '../utils/theme'

/**
 * 风格切换：暗墨（第一种风格）⇄ 亮纸（白色基调）。
 * 图标表达「将切换到的目标风格」：暗墨时显日（点入亮纸），亮纸时显月（点回暗墨）。
 */
export default function ThemeToggle() {
  const theme = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={isLight}
      aria-label={isLight ? '切换为暗墨风格' : '切换为亮纸风格'}
      title={isLight ? '切换为暗墨风格' : '切换为亮纸风格'}
      onClick={() => {
        flashThemeTransition()
        toggleTheme()
      }}
    >
      {isLight ? (
        /* 月：回暗墨 */
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
          <path
            d="M16.2 11.6A7.2 7.2 0 0 1 8.4 3.8a7.4 7.4 0 1 0 7.8 7.8Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        /* 日：入亮纸 */
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
          <circle cx="10" cy="10" r="3.4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M10 2.4v2M10 15.6v2M2.4 10h2M15.6 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6 14 6M6 14l-1.4 1.4" />
          </g>
        </svg>
      )}
      <span>{isLight ? '暗墨' : '亮纸'}</span>
    </button>
  )
}
