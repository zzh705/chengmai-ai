/**
 * 背景音：WebAudio 程序化「书房听雨」式极简环境音。
 * 五声音阶（D 羽）稀疏拨弦 + 低音持续层 + 短延迟空间感，默认关闭、显式开启，
 * 不依赖任何音频素材与版权。
 *
 * 持续播放的关键：不用一次性 setTimeout 链（后台标签页被节流后容易断），
 * 改用「前瞻调度器」——固定间隔的调度循环里，始终把未来 1.6s 内的音
 * 按 AudioContext 时钟精确排程；即使标签页被节流到 1s 一跳，也不会漏拍。
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let schedulerTimer: number | null = null
let nextNoteTime = 0
let step = 0
// 低音持续层（开馆时淡入、闭馆时淡出）
let droneOscs: OscillatorNode[] = []
let droneGain: GainNode | null = null

// D 羽五声：D F G A C（293~523Hz 柔和音区）
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
// 调度节拍：每 400ms 醒一次，把未来 1.6s 内的音排满
const SCHEDULE_INTERVAL = 400
const LOOKAHEAD = 1.6
// 音距：1.4~3.0s 一记拨弦，疏而不断
const GAP_MIN = 1.4
const GAP_MAX = 3.0

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

/** 低音持续层：D2+A2 双正弦，呼吸式微动，给拨弦垫一个「墨底」 */
function startDrone(ac: AudioContext) {
  if (droneGain) {
    droneGain.gain.cancelScheduledValues(ac.currentTime)
    droneGain.gain.setTargetAtTime(0.16, ac.currentTime, 0.8)
    return
  }
  droneGain = ac.createGain()
  droneGain.gain.setValueAtTime(0, ac.currentTime)
  droneGain.gain.setTargetAtTime(0.16, ac.currentTime, 0.8)
  droneGain.connect(master!)

  // 呼吸 LFO：0.06Hz 缓慢起伏，避免持续层死板
  const lfo = ac.createOscillator()
  const lfoAmp = ac.createGain()
  lfo.frequency.value = 0.06
  lfoAmp.gain.value = 0.05
  lfo.connect(lfoAmp)
  lfoAmp.connect(droneGain.gain)
  lfo.start()

  const freqs = [73.42, 110.0] // D2 · A2
  droneOscs = freqs.map((f) => {
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    o.connect(droneGain!)
    o.start()
    return o
  })
  droneOscs.push(lfo)
}

/** 关闭持续层：1s 缓出后停振，避免「啪」地掐断 */
function stopDrone(ac: AudioContext) {
  if (!droneGain) return
  const g = droneGain
  const oscs = droneOscs
  droneGain = null
  droneOscs = []
  g.gain.cancelScheduledValues(ac.currentTime)
  g.gain.setTargetAtTime(0, ac.currentTime, 0.4)
  window.setTimeout(() => {
    oscs.forEach((o) => {
      try {
        o.stop()
      } catch {
        /* 已停止则忽略 */
      }
    })
    g.disconnect()
  }, 1600)
}

function scheduleNext() {
  if (!ctx || !master) return
  const ac = ctx
  // 前瞻窗口内逐记排程；nextNoteTime 落后于当前时间则先追平（节流醒来后补位）
  if (nextNoteTime < ac.currentTime) nextNoteTime = ac.currentTime + 0.05
  while (nextNoteTime < ac.currentTime + LOOKAHEAD) {
    const options = NEIGHBOR[step % NEIGHBOR.length]
    step = options[Math.floor(Math.random() * options.length)]
    pluck(ac, SCALE[step], nextNoteTime)
    // 偶尔叠一枚高八度点缀，或与邻音构成双音
    const roll = Math.random()
    if (roll < 0.2) {
      pluck(ac, SCALE[step] * 2, nextNoteTime + 0.36)
    } else if (roll < 0.32 && step > 0) {
      pluck(ac, SCALE[step - 1], nextNoteTime + 0.12)
    }
    nextNoteTime += GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)
  }
}

export function startAmbient(): boolean {
  if (schedulerTimer !== null) return true
  try {
    const ac = ensureContext()
    startDrone(ac)
    nextNoteTime = ac.currentTime + 0.15
    scheduleNext()
  } catch {
    return false
  }
  schedulerTimer = window.setInterval(scheduleNext, SCHEDULE_INTERVAL)
  return true
}

export function stopAmbient(): void {
  if (schedulerTimer !== null) {
    window.clearInterval(schedulerTimer)
    schedulerTimer = null
  }
  // 已拨出的音自然衰减，持续层缓出
  if (ctx) stopDrone(ctx)
}
