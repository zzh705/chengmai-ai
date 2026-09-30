/**
 * LLM 文本清洗工具。
 * 模型常自行加入 emoji/装饰符号，与「回答中不用小图标」的排版规范冲突，
 * 统一在展示层清洗（流式场景下对累积全文清洗，避免半截码元误伤）。
 */

const EMOJI_RE =
  // eslint-disable-next-line no-misleading-character-class
  /\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{FE0E}\u{FE0F}\u{200D}\u{20E3}]|[\u{E0020}-\u{E007F}]/gu

/** 去除 emoji、变体选择符、ZWJ、肤色与区域指示符（保留 → · 等排版符号）。 */
export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '')
}

/** 清洗 LLM 输出：去 emoji → 收拾空行与行尾空白。 */
export function cleanLLM(text: string): string {
  return stripEmoji(text)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 深度清洗结构化 LLM 结果（路线/测验/故事/活化方案等任意 JSON 对象）。 */
export function stripEmojiDeep<T>(value: T): T {
  if (typeof value === 'string') return stripEmoji(value) as T
  if (Array.isArray(value)) return value.map((v) => stripEmojiDeep(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = stripEmojiDeep(v)
    return out as T
  }
  return value
}
