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

// 2. 星空星座图：加载统计 → 图例聚焦星座 → 知识库筛选
const openGraph = async () => {
  await page.click('nav button:has-text("知识图谱")')
  await page.waitForSelector('.graph-canvas', { timeout: 8000 })
  await page.waitForFunction(() => !document.querySelector('.graph-loading'), null, { timeout: 10000 })
  await page.waitForTimeout(400)
}
await openGraph()
await page.waitForTimeout(1800)
const skyStats = (await page.textContent('.graph-header p'))?.replace(/\s+/g, ' ').trim()
console.log('star stats:', skyStats?.slice(0, 74))
const legendCount = await page.locator('.graph-legend-item').count()
console.log('legend constellations:', legendCount)
await shot('新-图谱-星空')

await page.click('.graph-legend-item >> nth=0')
await page.waitForSelector('.graph-detail', { timeout: 5000 })
await page.waitForTimeout(150) // dataset 由渲染帧写入，隔帧再读
const catFocus = await page.getAttribute('.graph-canvas', 'data-focus')
const catLabel = await page.textContent('.graph-detail-head strong')
console.log('category focus:', catFocus, '| panel:', catLabel?.trim())
await shot('新-图谱-类别面板')
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
  story: document.querySelector('.kb-story p')?.textContent?.trim().length ?? 0,
  storyTitle: document.querySelector('.kb-story-title')?.textContent?.trim() ?? '',
  tlNodes: document.querySelectorAll('.kb-tl-node').length,
  tlYears: [...document.querySelectorAll('.kb-tl-year')].map((e) => e.textContent.trim()),
}))
console.log('detail fresh:', JSON.stringify(freshDetail))
await shot('新-知识库-详情三件套')
await page.click('.kb-back')
await page.waitForSelector('.kb-cards', { timeout: 3000 })

// 3. 搜索选星 → 项目面板 → 去地图
await openGraph()
await page.fill('.graph-search input', '绣')
await page.waitForSelector('.graph-search-item', { timeout: 3000 })
const searchN = await page.locator('.graph-search-item').count()
await page.click('.graph-search-item >> nth=0')
await page.waitForSelector('.graph-detail', { timeout: 5000 })
await page.waitForTimeout(700)
const starName = (await page.textContent('.graph-detail-head strong'))?.trim()
const starType = (await page.textContent('.graph-detail-type'))?.trim()
const starSel = await page.getAttribute('.graph-canvas', 'data-sel')
const starInfo = (await page.textContent('.graph-detail-info').catch(() => ''))?.replace(/\s+/g, ' ').trim()
console.log('search star:', starName, `| ${searchN} 条结果 | type:`, starType, '| sel:', starSel?.slice(0, 14))
console.log('star panel info:', starInfo?.slice(0, 70))
await shot('新-图谱-项目面板')
await page.click('.graph-detail .graph-btn:has-text("去非遗地图")')
await page.waitForTimeout(900)
const selectedProv = await page.textContent('.map-panel h2')
console.log('star → map panel:', selectedProv?.trim())
await shot('新-地图-自动选中')

// 4. 深读亮星：档案简介 + 关联关系 + 知识库详情直达
const deepName = await page.evaluate(async () => {
  const list = await (await fetch('/api/heritage')).json()
  const d = list.find((x) => x.tier !== 'index' && x.name.length >= 3)
  return d ? d.name : ''
})
await openGraph()
await page.fill('.graph-search input', deepName)
await page.waitForSelector('.graph-search-item', { timeout: 3000 })
await page.click('.graph-search-item >> nth=0')
await page.waitForSelector('.graph-detail', { timeout: 5000 })
await page
  .waitForFunction(() => !document.querySelector('.graph-detail .graph-loading-line'), null, { timeout: 6000 })
  .catch(() => {})
const deepType = (await page.textContent('.graph-detail-type'))?.trim()
const deepInfo = (await page.textContent('.graph-detail-info').catch(() => ''))?.replace(/\s+/g, ' ').trim()
const relN = await page.locator('.graph-relation-line').count()
await page.waitForTimeout(800) // 等选星运镜收尾，data-star 才是终值
console.log('deep star:', deepName, '| type:', deepType, '| info:', deepInfo?.slice(0, 60), '| relations:', relN)
// hover 选中星子：tooltip 应显示（视图居中后星子坐标由 data-star 给出）
const starXY = await page.getAttribute('.graph-canvas', 'data-star')
const [starX, starY] = (starXY ?? '0,0').split(',').map(Number)
const cbox = await page.locator('.graph-canvas').boundingBox()
await page.mouse.move(cbox.x + starX, cbox.y + starY)
await page.waitForTimeout(300)
const hoverAttr = (await page.getAttribute('.graph-canvas', 'data-hover')) ?? ''
const tipOn = await page.evaluate(() =>
  getComputedStyle(document.querySelector('.graph-tip')).opacity,
)
const tipText = await page.evaluate(() => document.querySelector('.graph-tip')?.textContent ?? '')
console.log(
  'hover tooltip:',
  tipOn !== '0' ? 'shown' : 'hidden',
  '| hit:',
  hoverAttr.split('@')[0],
  '|',
  tipText.trim().slice(0, 40),
)
await shot('新-图谱-hover星子')
await page.mouse.move(200, 600) // 移开，避免遮挡后续点击
await page.waitForTimeout(200)
await shot('新-图谱-深读档案')
await page.click('.graph-detail .graph-btn.primary')
await page.waitForTimeout(1000)
const detailTitle = await page.textContent('.kb-detail h1')
console.log('knowledge detail opened:', detailTitle?.trim().slice(0, 30))
await shot('新-知识库-详情直达')

// 5. 缩放/复位/关闭面板（视图经 canvas dataset 断言）
await openGraph()
await page.waitForTimeout(800) // 等 fitAll 动画收尾，v0 才是终值
const v0 = await page.getAttribute('.graph-canvas', 'data-view')
await page.locator('.graph-zoom button').first().click()
await page.waitForTimeout(800)
const v1 = await page.getAttribute('.graph-canvas', 'data-view')
await page.locator('.graph-zoom button').nth(2).click()
await page.waitForTimeout(950)
const v2 = await page.getAttribute('.graph-canvas', 'data-view')
console.log('缩放生效:', v0 !== v1, '| 复位回到初始:', v2 === v0, `(${v0} → ${v1} → ${v2})`)
await page.click('.graph-legend-item >> nth=0')
await page.waitForSelector('.graph-detail', { timeout: 5000 })
await page.click('.graph-close')
const panelGone = (await page.locator('.graph-detail').count()) === 0
await page.click('.graph-reset')
await page.waitForTimeout(300)
const cleared =
  (await page.getAttribute('.graph-canvas', 'data-focus')) === '' &&
  (await page.getAttribute('.graph-canvas', 'data-sel')) === ''
console.log('关闭面板:', panelGone, '| 返回全图清空聚焦:', cleared)
await shot('新-图谱-复位')

// 8. 挑战页环形进度
await page.click('nav button:has-text("非遗挑战")')
await page.waitForTimeout(1600)
await shot('新-挑战-环形进度')

console.log('console errors:', errors.length ? errors : 'none')
await browser.close()
