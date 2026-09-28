/**
 * 语音讲解：基于 Web Speech API 的零资源方案。
 * 选中文（大陆优先）嗓音朗读详情导语，浏览器不支持时返回 false，页面据此隐藏入口。
 */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const zh = voices.filter((v) => /zh[-_]CN|^zh$/i.test(v.lang))
  // 首选慈爱柔和的中文女声（婷婷/晓晓/慧慧/佳佳/谷歌普通话），其次任意中文女声
  const female = /Ting|Xiao|Hui|Mei|Jia|Ya|Tian|Google/i
  const male = /Sinji|Kangkang|Yunxi|Yunye|Kang/i
  return (
    zh.find((v) => female.test(v.name) && !male.test(v.name)) ||
    zh.find((v) => !male.test(v.name)) ||
    zh[0] ||
    voices.find((v) => /^zh/i.test(v.lang)) ||
    null
  )
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
  const voice = pickVoice()
  if (voice) utter.voice = voice
  utter.onend = onEnd
  utter.onerror = onEnd
  window.speechSynthesis.speak(utter)
  return true
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel()
}
