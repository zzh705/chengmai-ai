/**
 * 背景音：WebAudio 程序化「书房听雨」式极简环境音。
 * 五声音阶（D 商调）稀疏拨弦 + 短延迟空间感，默认关闭、显式开启，
 * 不依赖任何音频素材与版权。
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let timer: number | null = null
let step = 0

// D 羽五声：D F G A C（293–523Hz 柔和音区）
const SCALE = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33]
// 相邻音的随机游走权重（近音优先，如级进）
const NEIGHBOR = [
  [1, 2],
  [0, 2, 3],
  [1, 3, 4],
  [2, 4, 5],
  [3, 5],
  [3, 4],
]

function ensureContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.1
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function pluck(ac: AudioContext, freq: number, when: number) {
  const osc = ac.createOscillator()
  const osc2 = ac.createOscillator()
  const env = ac.createGain()
  const lp = ac.createBiquadFilter()
  const delay = ac.createDelay(1)
  const fb = ac.createGain()

  osc.type = 'triangle'
  osc.frequency.value = freq
  osc2.type = 'sine'
  osc2.frequency.value = freq * 2.001 // 轻微倍频泛音，像丝弦

  lp.type = 'lowpass'
  lp.frequency.value = 1600

  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(0.5, when + 0.01)
  env.gain.exponentialRampToValueAtTime(0.001, when + 3.2)

  delay.delayTime.value = 0.31
  fb.gain.value = 0.32

  osc.connect(env)
  osc2.connect(env)
  env.connect(lp)
  lp.connect(master!)
  lp.connect(delay)
  delay.connect(fb)
  fb.connect(delay)
  delay.connect(master!)

  osc.start(when)
  osc2.start(when)
  osc.stop(when + 3.4)
  osc2.stop(when + 3.4)
}

function scheduleNext() {
  if (!timer) return
  const ac = ensureContext()
  const options = NEIGHBOR[step % NEIGHBOR.length]
  step = options[Math.floor(Math.random() * options.length)]
  pluck(ac, SCALE[step], ac.currentTime + 0.05)
  // 偶尔叠一枚高八度点缀
  if (Math.random() < 0.22) {
    pluck(ac, SCALE[step] * 2, ac.currentTime + 0.36)
  }
  timer = window.setTimeout(scheduleNext, 3200 + Math.random() * 3400)
}

export function startAmbient(): boolean {
  if (timer !== null) return true
  try {
    ensureContext()
  } catch {
    return false
  }
  timer = window.setTimeout(scheduleNext, 300)
  return true
}

export function stopAmbient(): void {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  // 不关闭 AudioContext（反复创建开销大），已拨出的音自然衰减
}
