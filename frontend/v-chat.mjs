/* 聊天流式验证：首字节速度 + 完整作答 + console 0 错 */
import { chromium } from 'playwright-core'

const EXEC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: EXEC, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.click('nav button:has-text("承脉 AI")')
await page.waitForSelector('.chat-input input, .chat-input textarea', { timeout: 8000 })
const box = await page.$('.chat-input input, .chat-input textarea')
await box.fill('苏州园林为什么被称为咫尺之内再造乾坤？')
const t0 = Date.now()
await page.keyboard.press('Enter')
// 等首个非空助手文本
await page.waitForFunction(
  () => {
    const els = [...document.querySelectorAll('.bubble.assistant .bubble-content')]
    const last = els[els.length - 1]
    return last && last.textContent && last.textContent.trim().length > 12
  },
  null,
  { timeout: 12000 },
)
const tFirst = Date.now() - t0
// 等流结束（streaming 类消失/停止增长）
let prev = ''
let stable = 0
const tEnd = Date.now()
while (Date.now() - tEnd < 25000) {
  const cur = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.bubble.assistant .bubble-content')]
    return els[els.length - 1]?.textContent || ''
  })
  stable = cur === prev ? stable + 1 : 0
  prev = cur
  if (stable >= 8) break
  await page.waitForTimeout(500)
}
const total = Date.now() - t0
console.log(`首段文本 ${tFirst}ms | 稳定总时长 ${total}ms | 末尾长度 ${prev.length}`)
console.log('console errors:', errors.length ? errors.slice(0, 5) : 'none')
await browser.close()
process.exit(errors.length === 0 && tFirst < 6000 && prev.length > 60 ? 0 : 1)
