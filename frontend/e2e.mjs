import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

mkdirSync('/tmp/shots', { recursive: true })
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const shot = async (name) => page.screenshot({ path: `/tmp/shots/${name}.png` })

// 1. 首页动效
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await shot('新-首页')

// 2. 图谱：点地域节点 → 面板 → 去地图
await page.click('nav button:has-text("知识图谱")')
await page.waitForSelector('g.g-node', { timeout: 8000 })
await page.waitForTimeout(2500)
const clickNode = (type) =>
  page.evaluate((t) => {
    const n = [...document.querySelectorAll('g.g-node')].find((el) =>
      el.getAttribute('class').includes(`g-${t}`),
    )
    if (!n) return false
    n.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  }, type)
// 图上直接点：类别节点
let ok = await clickNode('category')
console.log('click category node:', ok)
await page.waitForSelector('.graph-detail', { timeout: 5000 })
await shot('新-图谱-类别面板')
const catLabel = await page.textContent('.graph-detail-head strong')
console.log('category panel:', catLabel?.trim())
await page.click('.graph-detail .graph-btn.primary')
await page.waitForTimeout(900)
const kwValue = await page.inputValue('.kb-header input')
console.log('knowledge keyword prefilled:', kwValue, 'cards:', await page.locator('.kb-card').count())
await shot('新-知识库-类别筛选')

// 3. 图谱：地域节点 → 去地图
await page.click('nav button:has-text("知识图谱")')
await page.waitForSelector('g.g-node', { timeout: 8000 })
await page.waitForTimeout(2500)
ok = await clickNode('region')
console.log('click region node:', ok)
await page.waitForSelector('.graph-detail', { timeout: 5000 })
const regionLabel = await page.textContent('.graph-detail-head strong')
await page.click('.graph-detail .graph-btn.primary')
await page.waitForTimeout(900)
const selectedProv = await page.textContent('.map-panel h2')
console.log('region:', regionLabel?.trim(), '→ map panel:', selectedProv?.trim())
await shot('新-地图-自动选中')

// 4. 图谱：项目节点 → 进入知识库详情
await page.click('nav button:has-text("知识图谱")')
await page.waitForSelector('g.g-heritage', { timeout: 8000 })
await page.waitForTimeout(2500)
ok = await clickNode('heritage')
console.log('click heritage node:', ok)
await page.waitForSelector('.graph-detail', { timeout: 5000 })
await page.waitForSelector('.graph-detail .graph-loading-line', { timeout: 3000 }).catch(() => {})
await shot('新-图谱-项目面板')
await page.click('.graph-detail .graph-btn.primary')
await page.waitForTimeout(1000)
const detailTitle = await page.textContent('.kb-detail h1')
console.log('knowledge detail opened:', detailTitle?.trim().slice(0, 30))
await shot('新-知识库-详情直达')

// 5. 图谱：来源节点面板（extra 内容）
await page.click('nav button:has-text("知识图谱")')
await page.waitForSelector('g.g-node', { timeout: 8000 })
await page.waitForTimeout(2500)
ok = await clickNode('source')
console.log('click source node:', ok)
await page.waitForSelector('.graph-detail', { timeout: 5000 })
const srcBody = await page.textContent('.graph-detail-info')
const hasLink = await page.locator('.graph-btn-link').count()
console.log('source panel:', srcBody?.trim().slice(0, 60), '| link btn:', hasLink)
await shot('新-图谱-来源面板')

// 6. 图谱：传承人面板
ok = await clickNode('person')
console.log('click person node:', ok)
await page.waitForTimeout(600)
const personBody = await page.textContent('.graph-detail-info')
console.log('person panel:', personBody?.trim().slice(0, 50))
await shot('新-图谱-传承人面板')

// 7. 挑战页环形进度
await page.click('nav button:has-text("非遗挑战")')
await page.waitForTimeout(1600)
await shot('新-挑战-环形进度')

console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
