/* 390×844 各页横向溢出 + 焦点可见抽查 */
import { chromium } from 'playwright-core'

const EXEC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PAGES = ['承脉 AI', '非遗知识库', '非遗地图', '学习路径', '活化实验室', '非遗挑战', '传承档案', '关于项目']
const browser = await chromium.launch({ executablePath: EXEC, headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
let bad = 0
const check = async (label) => {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
  const over = r.sw > r.cw + 1
  if (over) bad++
  console.log(`${over ? 'OVERFLOW' : 'ok'} ${label} ${r.sw}/${r.cw}`)
}
await check('首页')
for (const p of PAGES) {
  await page.click(`nav button:has-text("${p}")`)
  await page.waitForTimeout(700)
  await check(p)
}
console.log('pageerrors:', errors.length ? errors : 'none')
await browser.close()
process.exit(bad === 0 && errors.length === 0 ? 0 : 1)
