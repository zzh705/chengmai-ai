/**
 * 语音讲解：基于 Web Speech API 的零密钥方案。
 *
 * 自然度策略：
 * 1. 嗓音优先级：云端神经声（微软 Natural 系晓晓/晓伊等）＞ Google 普通话（中国大陆）＞ 本地柔和女声；
 *    老牌机械声（Huihui/Kangkang 等）降权保底，粤语/台湾腔调靠后。
 * 2. 按嗓音档位分设语速音调：神经声近乎真人不再压嗓，本地旧声略提速提音去掉沉闷感。
 * 3. 长文先清洗 markdown/链接，再按句切成 ≤80 字短段连播，
 *    规避 Chrome 约 200 字截断与长段约 15 秒自动暂停两个老问题；
 *    另挂 resume 定时器双保险。
 *
 * 注意：Chrome/Safari 的 voices 是异步就绪的，首次 getVoices() 常为空，
 * 必须等 voiceschanged（或超时兜底）再选声，否则永远落回系统默认声。
 */

let voicesCache: SpeechSynthesisVoice[] = []
// 每发起一次 speak 自增；stopSpeaking/新一轮朗读会让旧令牌失效，旧回调全部作废
let roundToken = 0
let resumeTimer: ReturnType<typeof setInterval> | null = null

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** 主动刷新本地嗓音表；拿到非空结果即缓存。 */
function refreshVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return voicesCache
  try {
    const v = window.speechSynthesis.getVoices()
    if (v.length) voicesCache = v
  } catch {
    /* 隐私模式：忽略 */
  }
  return voicesCache
}

if (speechSupported()) {
  refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
}

/**
 * 选声评分：分数越低越优先。
 * 神经声与 Google 大陆声最接近真人；机械旧声不除名但压到保底。
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name
  const lang = v.lang.toLowerCase()
  const isCN = /^zh([-_]?cn)?$/.test(lang)
  const isYue = /zh[-_]?(hk|yue|han)/.test(lang)
  const isTW = /zh[-_]?tw/.test(lang)
  let s = 50
  if (isCN) s -= 30
  if (/natural/i.test(name)) {
    // 微软在线神经声（Edge/部分 Windows 暴露）：自然度第一梯队
    if (/Xiaoxiao|Xiaoyi|Xiaoxuan|Xiaomo|Xiaohan|Xiaorui|Xiaoshuang|Yunxi|Yunyang|Yunjian/i.test(name)) {
      s -= 62
    } else {
      s -= 46
    }
  }
  if (/^Google/i.test(name)) {
    // Google 普通话（中国大陆）为云端声，质感明显好于桌面旧声
    s += isCN ? -50 : -18
  }
  if (/Ting-?Ting/i.test(name)) s -= 12 // macOS 婷婷：稳但偏平
  if (/Mei-?Jia|Tian-?Tian|Li[n]?[ -]?Lin/i.test(name)) s -= 8
  // 老牌机械声降权保底
  if (/Huihui|Yaoyao|Kangkang|Sinji|Hanhan|Tracy/i.test(name)) s += 22
  if (isTW) s += 12
  if (isYue) s += 30
  return s
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = voicesCache.length ? voicesCache : refreshVoices()
  const zh = voices.filter((v) => /^zh/i.test(v.lang) || v.lang === 'zh')
  if (!zh.length) return null
  return zh.reduce<SpeechSynthesisVoice | null>((best, v) => {
    if (!best || scoreVoice(v) < scoreVoice(best)) return v
    return best
  }, null)
}

/** 按嗓音档位调韵律：好嗓子保持本真，旧嗓子靠语速音调补救。 */
function prosodyFor(voice: SpeechSynthesisVoice | null): { rate: number; pitch: number } {
  if (!voice) return { rate: 0.96, pitch: 1.04 }
  if (/natural/i.test(voice.name)) return { rate: 1.02, pitch: 1.0 }
  if (/^Google/i.test(voice.name)) return { rate: 0.98, pitch: 1.03 }
  return { rate: 0.95, pitch: 1.06 }
}

/** 文本清洗 + 按句切短段（不用正则后行断言，兼容旧版 Safari）。 */
function prepareText(raw: string): string[] {
  let t = raw
  t = t.replace(/```[\s\S]*?```/g, '，')
  t = t.replace(/`([^`]*)`/g, '$1')
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '，')
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  t = t.replace(/https?:\/\/\S+/g, '，')
  t = t.replace(/^#{1,6}\s*/gm, '')
  t = t.replace(/[*_>~#]/g, '')
  // 省略号/分号换成逗号，给朗读留出自然换气
  t = t.replace(/…+|；/g, '，')
  t = t.replace(/\s+/g, ' ')

  const MAX = 80
  const out: string[] = []
  const pushShort = (chunk: string) => {
    const segs = chunk.match(/[^，、,]+[，、,]?/g) ?? [chunk]
    let buf = ''
    for (const g of segs) {
      if ((buf + g).length <= MAX) {
        buf += g
      } else {
        if (buf) out.push(buf)
        // 单个逗号段仍超长（罕见长词）：硬切
        buf = g.length > MAX ? g.slice(0, MAX) : g
      }
    }
    if (buf) out.push(buf)
  }

  const sentences = t.match(/[^。！？!?；]+[。！？!?；]?/g) ?? [t]
  for (const s of sentences) {
    if (s.length <= MAX) {
      // 相邻短句合并到上限，减少段间停顿的割裂感
      const last = out[out.length - 1]
      if (last && last.length + s.length <= MAX) {
        out[out.length - 1] = last + s
      } else {
        out.push(s)
      }
    } else {
      pushShort(s)
    }
  }
  return out.map((p) => p.trim()).filter(Boolean).slice(0, 80)
}

function clearResumeTimer() {
  if (resumeTimer) {
    clearInterval(resumeTimer)
    resumeTimer = null
  }
}

/** Chrome 长朗读会莫名 paused：周期性唤醒。 */
function ensureResumeTimer(token: number) {
  clearResumeTimer()
  resumeTimer = setInterval(() => {
    if (token !== roundToken) {
      clearResumeTimer()
      return
    }
    const syn = window.speechSynthesis
    if (syn.paused && syn.speaking) {
      syn.resume()
    }
  }, 8000)
}

/**
 * 朗读一段中文讲解；返回 true 表示已启动。
 * 长文切段连播，全部读完（或出错）后回调 onEnd；被 stopSpeaking/新朗读打断时不回调。
 */
export function speak(text: string, onEnd: () => void): boolean {
  if (!speechSupported() || !text.trim()) return false
  // 打断上一轮（旧令牌失效，旧 onEnd 不触发）
  roundToken += 1
  const token = roundToken
  window.speechSynthesis.cancel()

  const parts = prepareText(text)
  if (!parts.length) return false

  const start = () => {
    if (token !== roundToken) return
    const voice = pickVoice()
    const { rate, pitch } = prosodyFor(voice)

    const speakPart = (i: number) => {
      if (token !== roundToken) return
      const u = new SpeechSynthesisUtterance(parts[i])
      u.lang = voice && /^zh/i.test(voice.lang) ? voice.lang : 'zh-CN'
      if (voice) u.voice = voice
      u.rate = rate
      u.pitch = pitch
      u.volume = 1
      u.onend = () => {
        if (token !== roundToken) return
        if (i + 1 < parts.length) {
          speakPart(i + 1)
        } else {
          clearResumeTimer()
          onEnd()
        }
      }
      u.onerror = () => {
        if (token !== roundToken) return
        // 非打断类错误直接收尾，让按钮复位
        clearResumeTimer()
        onEnd()
      }
      window.speechSynthesis.speak(u)
    }

    ensureResumeTimer(token)
    speakPart(0)
  }

  refreshVoices()
  if (voicesCache.length) {
    start()
    return true
  }

  // voices 未就绪：等 voiceschanged，400ms 兜底直接用默认声开讲
  let settled = false
  const timer = setTimeout(() => {
    if (settled) return
    settled = true
    window.speechSynthesis.removeEventListener('voiceschanged', onReady)
    start()
  }, 400)
  function onReady() {
    if (settled || !refreshVoices().length) return
    settled = true
    clearTimeout(timer)
    window.speechSynthesis.removeEventListener('voiceschanged', onReady)
    start()
  }
  window.speechSynthesis.addEventListener('voiceschanged', onReady)
  return true
}

export function stopSpeaking(): void {
  if (!speechSupported()) return
  roundToken += 1
  clearResumeTimer()
  window.speechSynthesis.cancel()
}
