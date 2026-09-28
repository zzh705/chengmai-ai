/**
 * 语音讲解：基于 Web Speech API 的零资源方案。
 * 选中文（大陆优先）嗓音朗读详情导语，浏览器不支持时返回 false，页面据此隐藏入口。
 */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => /zh[-_]CN/i.test(v.lang) && /Ting|Xiao|Ya|Mei|Sinji/i.test(v.name)) ||
    voices.find((v) => /zh[-_]CN/i.test(v.lang)) ||
    voices.find((v) => /^zh/i.test(v.lang)) ||
    null
  )
}

/** 朗读一段中文讲解；返回 true 表示已启动。 */
export function speak(text: string, onEnd: () => void): boolean {
  if (!speechSupported() || !text) return false
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 0.95
  utter.pitch = 1
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
