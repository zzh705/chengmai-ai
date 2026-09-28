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

// 1. 开屏仪式动画 → 跳过 → 首页动效 + 地域 chip 按省份归一
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
const splashShown = await page.locator('.splash').count()
await page.click('.splash-skip').catch(() => {})
await page.waitForSelector('.splash', { state: 'detached', timeout: 4000 }).catch(() => {})
console.log('开屏动画:', splashShown ? '已播放（点击可跳过）' : '未出现')
await page.waitForTimeout(1200)
await shot('新-首页')
const chipTexts = await page.locator('.home-regions button').allTextContents()
const chipMax = Math.max(0, ...chipTexts.map((t) => t.trim().length))
console.log('region chips:', chipTexts.length, '| 最长文案', chipMax, '字 |', chipTexts.slice(0, 6).map((t) => t.trim()).join(' / '))

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

// 2b. 知识库：卡片悬念钩子 + 详情三件套（钩子大字/数字滚动/你知道吗）
const hooked = await page.locator('.kb-card-hook').count()
const cardTotal = await page.locator('.kb-card').count()
console.log('kb hook on cards:', hooked, '/', cardTotal)
await page.click('.kb-card >> nth=0')
await page.waitForSelector('.kb-hook', { timeout: 5000 })
await page.waitForTimeout(1300)
const freshDetail = await page.evaluate(() => ({
  hook: document.querySelector('.kb-hook')?.textContent?.trim().slice(0, 24) ?? '',
  wow: [...document.querySelectorAll('.kb-wow-item em')].map((e) => e.textContent.trim()),
  facts: document.querySelectorAll('.kb-facts li').length,
  factsTitle: document.querySelector('.kb-facts-title')?.textContent?.trim() ?? '',
}))
console.log('detail fresh:', JSON.stringify(freshDetail))
await shot('新-知识库-详情三件套')
await page.click('.kb-back')
await page.waitForSelector('.kb-cards', { timeout: 3000 })

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

// 7. 图谱：hover 高亮邻居 / 图例隐藏 / 缩放控件
await page.click('nav button:has-text("知识图谱")')
await page.waitForSelector('g.g-node', { timeout: 8000 })
await page.waitForTimeout(2500)
// 先取消前一步的选中，避免"选中高亮"干扰 hover 断言
if (await page.locator('.graph-close').count()) {
  await page.click('.graph-close')
  await page.waitForTimeout(300)
}
const hoverRes = await page.evaluate(() => {
  const n = [...document.querySelectorAll('g.g-node')].find(
    (el) => el.getAttribute('class').includes('g-heritage'),
  )
  if (!n) return null
  n.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
  const dimmed = document.querySelectorAll('g.g-node.g-dim').length
  n.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
  const cleared = document.querySelectorAll('g.g-node.g-dim').length
  return { dimmed, cleared }
})
console.log('hover 高亮：变暗', hoverRes?.dimmed, '个节点 → 移开后剩', hoverRes?.cleared, '个')
await page.evaluate(() => {
  const n = [...document.querySelectorAll('g.g-node')].find((el) =>
    el.getAttribute('class').includes('g-heritage'),
  )
  n?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
})
await shot('新-图谱-hover高亮')
await page.evaluate(() => {
  document.querySelectorAll('g.g-node').forEach((el) =>
    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })),
  )
})

const visible = () =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('g.g-node')].filter(
        (el) => getComputedStyle(el).display !== 'none',
      ).length,
  )
const before = await visible()
await page.click('.graph-legend-item:has-text("作品")')
await page.waitForTimeout(350)
const after = await visible()
console.log('图例隐藏「作品」:', before, '→', after, '个可见节点')
await shot('新-图谱-图例隐藏')
await page.click('.graph-legend-item:has-text("作品")')
await page.waitForTimeout(350)

const t0 = await page.evaluate(() => document.querySelector('.graph-svg > g').getAttribute('transform'))
await page.locator('.graph-zoom button').first().click()
await page.waitForTimeout(600)
const t1 = await page.evaluate(() => document.querySelector('.graph-svg > g').getAttribute('transform'))
console.log('缩放控件生效:', t0 !== t1, '|', t0, '→', t1)
await page.locator('.graph-zoom button').nth(2).click()
await page.waitForTimeout(600)
const t2 = await page.evaluate(() => document.querySelector('.graph-svg > g').getAttribute('transform'))
console.log('复位视图生效:', t2 === 'translate(0,0) scale(1)' || t2 === null || t2 === 'translate(0,0)', '|', t2)

// 8. 挑战页环形进度
await page.click('nav button:has-text("非遗挑战")')
await page.waitForTimeout(1600)
await shot('新-挑战-环形进度')

console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
