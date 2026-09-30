/* 图谱静止态截图 + 双帧静止 diff + FPS */
import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync } from 'node:fs'
import zlib from 'node:zlib'

const EXEC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
mkdirSync('/tmp/shots', { recursive: true })

const browser = await chromium.launch({ executablePath: EXEC, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.click('nav button:has-text("知识图谱")')
await page.waitForSelector('.graph-canvas')
await page.waitForFunction(() => !document.querySelector('.graph-loading'), null, { timeout: 10000 })
await page.waitForTimeout(3200)
await page.screenshot({ path: '/tmp/shots/graph-rest.png' })
await page.waitForTimeout(1200)
await page.screenshot({ path: '/tmp/shots/graph-rest2.png' })
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0
      const t0 = performance.now()
      const tick = () => {
        n++
        if (performance.now() - t0 < 2000) requestAnimationFrame(tick)
        else res((n / ((performance.now() - t0) / 1000)).toFixed(1))
      }
      requestAnimationFrame(tick)
    }),
)
console.log('fps', fps)
await browser.close()

function decode(path) {
  const buf = readFileSync(path)
  let p = 8, w = 0, h = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4) }
    else if (type === 'IDAT') idat.push(data)
    p += 12 + len
  }
  return zlib.inflateSync(Buffer.concat(idat)).subarray(0, w * h * 4)
}
const a = decode('/tmp/shots/graph-rest.png')
const b = decode('/tmp/shots/graph-rest2.png')
let diff = 0, n = a.length / 4
for (let i = 0; i < a.length; i += 4) {
  if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) diff++
}
console.log(`静止 diff ${(100 * diff / n).toFixed(2)}% (应 <20%)`)
