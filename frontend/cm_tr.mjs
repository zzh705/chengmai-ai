import pw from 'playwright-core'

const browser = await pw.chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4200) // 跳过开屏

// 场景 1：首页输入问题点"问 AI"（带 initialQuery 进 Chat）
await page.fill('.home-ask input', '苏绣为什么有名')
await page.locator('.home-ask button').first().click()
for (const [t, name] of [[120, 'a'], [300, 'b'], [520, 'c'], [850, 'd'], [1400, 'e']]) {
  await page.waitForTimeout(t)
  await page.screenshot({ path: `/tmp/cm-shots/tr-q-${name}.png` })
}

// 回首页，再场景 2：直接点导航"承脉 AI"（无问题，模式特写卡）
await page.locator('.app-nav-links button', { hasText: '首页' }).first().click()
await page.waitForTimeout(1200)
await page.locator('.app-nav-links button', { hasText: '承脉 AI' }).first().click()
for (const [t, name] of [[120, 'a'], [300, 'b'], [520, 'c'], [850, 'd'], [1400, 'e']]) {
  await page.waitForTimeout(t)
  await page.screenshot({ path: `/tmp/cm-shots/tr-nav-${name}.png` })
}
console.log('done')
await browser.close()
