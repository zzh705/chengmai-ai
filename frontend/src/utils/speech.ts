/**
 * 语音讲解：基于 Web Speech API 的零资源方案。
 * 选中文（大陆优先）嗓音朗读详情导语，浏览器不支持时返回 false，页面据此隐藏入口。
 *
 * 注意：Chrome/Safari 的 voices 是异步就绪的，首次 getVoices() 常为空，
 * 必须等 voiceschanged（或超时兜底）再选声，否则永远落回系统默认声。
 */

let voicesCache: SpeechSynthesisVoice[] = []

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

/** 打分选声：谷歌普通话语质最稳，其次婷婷/晓晓等柔和女声，再次任意中文女声。 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = voicesCache.length ? voicesCache : refreshVoices()
  const zh = voices.filter((v) => /zh[-_]CN|^zh$/i.test(v.lang) || /^zh/i.test(v.lang))
  if (!zh.length) return null
  const female = /Google|Ting|XiaoXiao|Xiao|Hui|Mei|Jia|Ya|Tian|Lili|Na/i
  const male = /Sinji|Kangkang|Yunxi|Yunye|Kang|Yunyang|Yunjian/i
  const usable = zh.filter((v) => !male.test(v.name))
  const pool = usable.length ? usable : zh
  let best: SpeechSynthesisVoice | null = null
  let bestScore = Infinity
  for (const v of pool) {
    let s = 2
    if (/^Google/i.test(v.name)) s = 0
    else if (female.test(v.name)) s = 1
    if (s < bestScore) {
      best = v
      bestScore = s
    }
  }
  return best
}

/** 朗读一段中文讲解；返回 true 表示已启动。语速略缓、音调略沉，取慈爱讲述感。 */
export function speak(text: string, onEnd: () => void): boolean {
  if (!speechSupported() || !text) return false
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 0.92
  utter.pitch = 0.9
  utter.volume = 1

  const begin = () => {
    const voice = pickVoice()
    if (voice) utter.voice = voice
    utter.onend = onEnd
    utter.onerror = onEnd
    window.speechSynthesis.speak(utter)
  }

  refreshVoices()
  if (voicesCache.length) {
    begin()
    return true
  }

  // voices 未就绪：等 voiceschanged，350ms 兜底直接用默认声开讲
  let settled = false
  const timer = setTimeout(() => {
    if (settled) return
    settled = true
    window.speechSynthesis.removeEventListener('voiceschanged', onReady)
    begin()
  }, 350)
  function onReady() {
    if (settled || !refreshVoices().length) return
    settled = true
    clearTimeout(timer)
    window.speechSynthesis.removeEventListener('voiceschanged', onReady)
    begin()
  }
  window.speechSynthesis.addEventListener('voiceschanged', onReady)
  return true
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel()
}
