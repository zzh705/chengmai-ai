import pptxgen from 'pptxgenjs'

// ========== 品牌色 ==========
const C = {
  ink: '14110f',       // 墨黑底
  ink2: '1c1814',      // 次墨底（卡片）
  ink3: '241f1a',      // 浮层
  gold: 'e8c56b',      // 描金
  goldDim: 'b89a4e',   // 暗金
  red: 'b03a2e',       // 朱红
  teal: '4f8f7b',      // 青碧
  cream: 'f0e6d2',     // 米白正文
  muted: '9a8f80',     // 弱化文字
  line: '3a322a',      // 分割线
}

const FONT_SERIF = 'SimSun'
const FONT_SANS = 'Microsoft YaHei'

const pptx = new pptxgen()
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'WIDE'
pptx.author = '承脉AI团队'
pptx.company = '承脉AI'
pptx.subject = '路演演示'
pptx.title = '承脉AI — 中华非遗智能传承与活化智能体'
pptx.lang = 'zh-CN'
pptx.theme = {
  headFontFace: FONT_SERIF,
  bodyFontFace: FONT_SANS,
  lang: 'zh-CN',
}

// 每页统一背景 + 顶部金边 + 底部页码
function baseSlide(num, total) {
  const s = pptx.addSlide()
  s.background = { color: C.ink }
  // 顶部描金线
  s.addShape(pptx.ShapeType.line, { x: 0.6, y: 0.55, w: 12.13, h: 0, line: { color: C.gold, width: 0.75 } })
  // 底部页码
  s.addText(`${String(num).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
    x: 11.8, y: 7.0, w: 1.0, h: 0.3, fontSize: 9, color: C.muted, fontFace: FONT_SANS, align: 'right',
  })
  // 左下印章标识
  s.addText('承脉', {
    x: 0.6, y: 6.95, w: 1.2, h: 0.4, fontSize: 12, color: C.red, bold: true, fontFace: FONT_SERIF,
  })
  return s
}

// 章节小标题（页面顶部）
function pageTitle(slide, title, en) {
  slide.addText(title, {
    x: 0.9, y: 0.85, w: 10, h: 0.6, fontSize: 28, color: C.gold, bold: true, fontFace: FONT_SERIF, charSpacing: 4,
  })
  if (en) {
    slide.addText(en, {
      x: 0.92, y: 1.42, w: 10, h: 0.3, fontSize: 10, color: C.muted, fontFace: FONT_SANS, charSpacing: 3,
    })
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.9, y: 1.8, w: 1.2, h: 0, line: { color: C.red, width: 2 },
  })
}

const TOTAL = 16

// ==================== 1. 封面 ====================
{
  const s = pptx.addSlide()
  s.background = { color: C.ink }
  // 大印章
  s.addShape(pptx.ShapeType.rect, {
    x: 5.67, y: 1.5, w: 2.0, h: 2.0, fill: { color: C.red }, line: { color: C.red },
  })
  s.addText('承脉', {
    x: 5.67, y: 1.78, w: 2.0, h: 1.4, fontSize: 54, color: C.cream, bold: true, fontFace: FONT_SERIF, align: 'center', valign: 'middle',
  })
  // 主标题
  s.addText('承脉 AI', {
    x: 0.5, y: 3.8, w: 12.33, h: 0.9, fontSize: 40, color: C.gold, bold: true, fontFace: FONT_SERIF, align: 'center', charSpacing: 12,
  })
  s.addText('中华非遗智能传承与活化智能体', {
    x: 0.5, y: 4.65, w: 12.33, h: 0.5, fontSize: 18, color: C.cream, fontFace: FONT_SANS, align: 'center', charSpacing: 6,
  })
  // 饰线
  s.addShape(pptx.ShapeType.line, { x: 4.5, y: 5.35, w: 4.33, h: 0, line: { color: C.gold, width: 1 } })
  s.addText('让 AI 读懂非遗，让年轻人成为传承者', {
    x: 0.5, y: 5.5, w: 12.33, h: 0.4, fontSize: 13, color: C.muted, fontFace: FONT_SANS, align: 'center', charSpacing: 2,
  })
  // 赛事信息
  s.addText('2026 华北五省（市、自治区）及港澳台大学生计算机应用大赛 · 大模型与智能体应用赛道', {
    x: 0.5, y: 6.7, w: 12.33, h: 0.35, fontSize: 10, color: C.muted, fontFace: FONT_SANS, align: 'center',
  })
}

// ==================== 2. 痛点 ====================
{
  const s = baseSlide(2, TOTAL)
  pageTitle(s, '非遗传承的三重困境', 'THE PROBLEM')

  const cards = [
    { icon: '散', title: '知识散落', desc: '非遗信息分散于政府名录、论文、新闻之中，缺乏结构化、可检索的统一入口。', color: C.red },
    { icon: '远', title: '距离感强', desc: '年轻群体觉得非遗「老」「远」「看不懂」，传统叙事难以触达 Z 世代。', color: C.gold },
    { icon: '断', title: '传承断层', desc: '了解 — 学习 — 参与 — 传播的链条断裂，多数人停留在「看过」，无法转化为传承行动。', color: C.teal },
  ]
  cards.forEach((c, i) => {
    const x = 0.9 + i * 4.05
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.3, w: 3.65, h: 3.8, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1,
    })
    s.addShape(pptx.ShapeType.rect, { x, y: 2.3, w: 3.65, h: 0.06, fill: { color: c.color }, line: { color: c.color } })
    s.addText(c.icon, { x, y: 2.55, w: 3.65, h: 0.9, fontSize: 40, color: c.color, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addText(c.title, { x: x + 0.2, y: 3.6, w: 3.25, h: 0.5, fontSize: 18, color: C.cream, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addShape(pptx.ShapeType.line, { x: x + 1.3, y: 4.15, w: 1.05, h: 0, line: { color: c.color, width: 1 } })
    s.addText(c.desc, { x: x + 0.25, y: 4.35, w: 3.15, h: 1.6, fontSize: 11, color: C.muted, fontFace: FONT_SANS, align: 'left', valign: 'top', lineSpacingMultiple: 1.5 })
  })
}

// ==================== 3. 方案 ====================
{
  const s = baseSlide(3, TOTAL)
  pageTitle(s, '承脉 AI 的解法', 'THE SOLUTION')

  s.addText('不只是一个 AI 聊天机器人，而是一条完整的「传承闭环」', {
    x: 0.9, y: 2.0, w: 11.5, h: 0.4, fontSize: 14, color: C.gold, fontFace: FONT_SANS,
  })

  const flow = [
    { t: '了解非遗', d: '3299 项国家级名录\n全量结构化 + 权威配图', c: C.gold },
    { t: '理解非遗', d: '三视角 AI 对话\n来源 + 证据分可核验', c: C.teal },
    { t: '学习非遗', d: '个性化学习路径\n知识图谱 / 地图导航', c: C.goldDim },
    { t: '参与非遗', d: '活化实验室生成方案\n文化护栏防跑偏', c: C.red },
    { t: '传播非遗', d: '非遗挑战 + 传承档案\n徽章激励持续打卡', c: C.teal },
  ]
  flow.forEach((f, i) => {
    const x = 0.7 + i * 2.5
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.7, w: 2.2, h: 2.6, fill: { color: C.ink2 }, line: { color: f.c, width: 0.75 }, rectRadius: 0.08,
    })
    s.addText(`0${i + 1}`, { x, y: 2.85, w: 2.2, h: 0.4, fontSize: 11, color: f.c, fontFace: FONT_SANS, align: 'center', charSpacing: 2 })
    s.addText(f.t, { x, y: 3.3, w: 2.2, h: 0.5, fontSize: 16, color: C.cream, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addShape(pptx.ShapeType.line, { x: x + 0.7, y: 3.85, w: 0.8, h: 0, line: { color: f.c, width: 1 } })
    s.addText(f.d, { x: x + 0.15, y: 4.0, w: 1.9, h: 1.2, fontSize: 9.5, color: C.muted, fontFace: FONT_SANS, align: 'center', valign: 'top', lineSpacingMultiple: 1.4 })
    if (i < flow.length - 1) {
      s.addText('→', { x: x + 2.2, y: 3.6, w: 0.3, h: 0.6, fontSize: 16, color: C.muted, align: 'center' })
    }
  })

  s.addText('用户需求 → 场景识别 → 知识检索 → 来源/证据校验 → 智能体规划 → 个性化回答/教学/创作 → 传承任务 → 学习档案 → 下一次推荐', {
    x: 0.9, y: 5.7, w: 11.5, h: 0.7, fontSize: 10, color: C.goldDim, fontFace: FONT_SANS, align: 'center', italic: true, lineSpacingMultiple: 1.4,
  })
}

// ==================== 4. 市场 ====================
{
  const s = baseSlide(4, TOTAL)
  pageTitle(s, '非遗数字化的广阔蓝海', 'MARKET')

  const stats = [
    { num: '3299', unit: '项', label: '国家级非物质文化遗产\n代表性项目名录', c: C.gold },
    { num: '1557', unit: '位', label: '国家级非遗代表性传承人', c: C.red },
    { num: '10', unit: '大门类', label: '民间文学 / 传统音乐 / 舞蹈\n戏剧 / 曲艺 / 体育游艺杂技\n美术 / 技艺 / 医药 / 民俗', c: C.teal },
    { num: '14', unit: '亿+', label: '全国文化与自然遗产日\n及各类非遗活动触达人次', c: C.goldDim },
  ]
  stats.forEach((st, i) => {
    const x = 0.7 + i * 3.1
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.3, w: 2.8, h: 3.6, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1,
    })
    s.addText(st.num, { x, y: 2.6, w: 2.8, h: 1.1, fontSize: 48, color: st.c, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addText(st.unit, { x: x + 1.7, y: 3.3, w: 0.8, h: 0.4, fontSize: 14, color: st.c, fontFace: FONT_SANS, align: 'left' })
    s.addShape(pptx.ShapeType.line, { x: x + 0.7, y: 4.0, w: 1.4, h: 0, line: { color: st.c, width: 1 } })
    s.addText(st.label, { x: x + 0.2, y: 4.15, w: 2.4, h: 1.6, fontSize: 10, color: C.muted, fontFace: FONT_SANS, align: 'center', valign: 'top', lineSpacingMultiple: 1.5 })
  })
  s.addText('数据来源：中国非物质文化遗产网、文化和旅游部公开统计', {
    x: 0.9, y: 6.3, w: 11.5, h: 0.3, fontSize: 8, color: C.muted, fontFace: FONT_SANS, align: 'right', italic: true,
  })
}

// ==================== 5. 产品概览 ====================
{
  const s = baseSlide(5, TOTAL)
  pageTitle(s, '十屏叙事 · 一站式传承平台', 'PRODUCT OVERVIEW')

  const pages = [
    { n: '首页', d: '今日非遗 / AI 推荐 / 地域探索' },
    { n: '承脉 AI', d: '三视角对话 + 证据分来源' },
    { n: '知识库', d: '3299 项名录 + 深读档案' },
    { n: '知识图谱', d: '180 节点 D3 力导向星图' },
    { n: '非遗地图', d: 'd3-geo 中国地图地域着色' },
    { n: '学习路径', d: '目标/天数/时长 个性化计划' },
    { n: '活化实验室', d: '文化护栏 + 四宫格生成' },
    { n: '非遗挑战', d: '正确率环 + 传承徽章' },
    { n: '传承档案', d: '四类埋点 + 兴趣画像' },
    { n: '关于项目', d: '架构 / 技术栈 / 来源声明' },
  ]
  pages.forEach((p, i) => {
    const col = i % 5, row = Math.floor(i / 5)
    const x = 0.7 + col * 2.5
    const y = 2.3 + row * 2.15
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.25, h: 1.85, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.08,
    })
    s.addText(p.n, { x, y: y + 0.2, w: 2.25, h: 0.5, fontSize: 15, color: C.gold, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addText(p.d, { x: x + 0.15, y: y + 0.75, w: 1.95, h: 1.0, fontSize: 9, color: C.muted, fontFace: FONT_SANS, align: 'center', valign: 'top', lineSpacingMultiple: 1.4 })
  })
}

// ==================== 6. 承脉AI 三视角 ====================
{
  const s = baseSlide(6, TOTAL)
  pageTitle(s, '承脉 AI · 三视角对话', 'CORE FEATURE 01')

  s.addText('同一个问题，三种身份的回答 —— 让非遗有温度、有立场、有青春感', {
    x: 0.9, y: 2.0, w: 11.5, h: 0.4, fontSize: 12, color: C.goldDim, fontFace: FONT_SANS, italic: true,
  })

  const modes = [
    { n: '学者', c: C.teal, d: '博引旁征 · 考据严谨', desc: '以学术视角梳理源流、流派与演变，引用权威文献，回答附「来源 + 证据分」。' },
    { n: '传承人', c: C.red, d: '口传心授 · 匠人温度', desc: '以第一人称讲述技艺背后的故事、口诀与手感，让用户触摸到传承的呼吸。' },
    { n: '青年传播者', c: C.gold, d: '网感表达 · 破圈传播', desc: '用 Z 世代听得懂的语言拆解非遗，提炼潮玩化、社交化的传播点。' },
  ]
  modes.forEach((m, i) => {
    const x = 0.7 + i * 4.15
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 2.7, w: 3.8, h: 3.6, fill: { color: C.ink2 }, line: { color: m.c, width: 0.75 }, rectRadius: 0.1,
    })
    s.addShape(pptx.ShapeType.rect, { x, y: 2.7, w: 3.8, h: 0.06, fill: { color: m.c }, line: { color: m.c } })
    s.addText(m.n, { x, y: 2.95, w: 3.8, h: 0.7, fontSize: 28, color: m.c, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addText(m.d, { x, y: 3.7, w: 3.8, h: 0.4, fontSize: 11, color: C.cream, fontFace: FONT_SANS, align: 'center', charSpacing: 2 })
    s.addShape(pptx.ShapeType.line, { x: x + 1.4, y: 4.2, w: 1.0, h: 0, line: { color: m.c, width: 1 } })
    s.addText(m.desc, { x: x + 0.25, y: 4.35, w: 3.3, h: 1.8, fontSize: 10.5, color: C.muted, fontFace: FONT_SANS, align: 'left', valign: 'top', lineSpacingMultiple: 1.5 })
  })
}

// ==================== 7. 知识图谱 ====================
{
  const s = baseSlide(7, TOTAL)
  pageTitle(s, '非遗星图 · 知识图谱', 'CORE FEATURE 02')

  // 左侧说明
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 2.3, w: 4.5, h: 4.0, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1,
  })
  const points = [
    '180 节点 / 240 关系的 D3 力导向图',
    '大类 = 星座 · 省份 = 星团 · 深读 = 亮星',
    '支持缩放、平移、搜索、点击详情',
    '子图聚焦：从全局到局部的认知路径',
    '可视化非遗项目间的流派与地域关联',
  ]
  points.forEach((p, i) => {
    s.addText('◆', { x: 0.95, y: 2.55 + i * 0.62, w: 0.3, h: 0.4, fontSize: 10, color: C.gold, fontFace: FONT_SERIF })
    s.addText(p, { x: 1.3, y: 2.55 + i * 0.62, w: 3.7, h: 0.4, fontSize: 11, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })

  // 右侧示意：星点
  const cx = 9.5, cy = 4.3
  const stars = [
    { x: 0, y: -1.2, r: 0.12, c: C.gold }, { x: -1.5, y: -0.6, r: 0.08, c: C.goldDim },
    { x: 1.3, y: -0.8, r: 0.1, c: C.gold }, { x: -1.8, y: 0.5, r: 0.07, c: C.goldDim },
    { x: 1.6, y: 0.4, r: 0.09, c: C.gold }, { x: -0.8, y: 1.0, r: 0.08, c: C.goldDim },
    { x: 0.9, y: 1.2, r: 0.11, c: C.gold }, { x: 0.2, y: 0.2, r: 0.14, c: C.red },
    { x: -0.5, y: -0.3, r: 0.06, c: C.goldDim }, { x: 0.7, y: -0.2, r: 0.07, c: C.goldDim },
  ]
  // 连线
  const lines = [[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[8,7],[9,7]]
  lines.forEach(([a,b]) => {
    s.addShape(pptx.ShapeType.line, {
      x: cx + stars[a].x, y: cy + stars[a].y,
      w: stars[b].x - stars[a].x, h: stars[b].y - stars[a].y,
      line: { color: '3a322a', width: 0.5 },
    })
  })
  stars.forEach((st) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: cx + st.x - st.r, y: cy + st.y - st.r, w: st.r * 2, h: st.r * 2,
      fill: { color: st.c }, line: { color: st.c },
    })
  })
  s.addText('非遗星图', { x: 7.6, y: 6.1, w: 3.8, h: 0.4, fontSize: 12, color: C.gold, fontFace: FONT_SERIF, align: 'center', charSpacing: 4 })
}

// ==================== 8. 非遗地图 ====================
{
  const s = baseSlide(8, TOTAL)
  pageTitle(s, '非遗地图 · 地域探索', 'CORE FEATURE 03')

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 2.3, w: 4.5, h: 4.0, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1,
  })
  const pts = [
    'd3-geo 渲染中国地图，按省份非遗密度着色',
    '点击省份即可查看当地全部非遗项目',
    '地域文化可视化：一眼看懂非遗分布格局',
    '与知识库、图谱双向跳转',
    '覆盖 15 个省级行政区的深读项目',
  ]
  pts.forEach((p, i) => {
    s.addText('◆', { x: 0.95, y: 2.55 + i * 0.62, w: 0.3, h: 0.4, fontSize: 10, color: C.gold, fontFace: FONT_SERIF })
    s.addText(p, { x: 1.3, y: 2.55 + i * 0.62, w: 3.7, h: 0.4, fontSize: 11, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })

  // 右侧：中国地图简化示意（省份色块）
  const mx = 8.5, my = 3.0
  const provinces = [
    { x: 1.0, y: 0.3, w: 0.8, h: 0.6, c: C.red },    // 东北
    { x: 1.3, y: 0.9, w: 0.7, h: 0.5, c: C.gold },
    { x: 0.5, y: 1.0, w: 0.7, h: 0.6, c: C.teal },
    { x: 0.8, y: 1.6, w: 0.9, h: 0.7, c: C.goldDim }, // 华北
    { x: 1.2, y: 2.3, w: 0.8, h: 0.6, c: C.gold },    // 华中
    { x: 0.6, y: 2.4, w: 0.7, h: 0.7, c: C.red },
    { x: 1.4, y: 2.9, w: 0.7, h: 0.6, c: C.teal },    // 华南
    { x: 0.9, y: 3.1, w: 0.6, h: 0.5, c: C.goldDim },
    { x: 0.3, y: 2.6, w: 0.6, h: 0.8, c: C.gold },    // 西南
    { x: 0.2, y: 1.8, w: 0.5, h: 0.7, c: C.teal },    // 西北
  ]
  provinces.forEach((p) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: mx + p.x, y: my + p.y, w: p.w, h: p.h, fill: { color: p.c, transparency: 35 }, line: { color: C.line, width: 0.3 }, rectRadius: 0.03,
    })
  })
  s.addText('地域密度着色示意', { x: 7.6, y: 6.1, w: 3.8, h: 0.4, fontSize: 12, color: C.gold, fontFace: FONT_SERIF, align: 'center', charSpacing: 4 })
}

// ==================== 9. 学习路径 + 活化实验室 ====================
{
  const s = baseSlide(9, TOTAL)
  pageTitle(s, '学习路径 · 活化实验室', 'CORE FEATURE 04')

  // 左：学习路径
  s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 2.3, w: 5.8, h: 4.0, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1 })
  s.addText('书山卷阶 · 学习路径', { x: 0.9, y: 2.45, w: 5.4, h: 0.45, fontSize: 16, color: C.gold, bold: true, fontFace: FONT_SERIF })
  const pathPts = [
    '目标 / 天数 / 每日时长自由组合',
    '从入门了解 → 深入掌握 → 讲给别人听三档',
    '3/7/14 天计划，每日任务打卡',
    '进度条本地持久化，断网也能学',
    '书山卷阶剪影：步步为营的视觉隐喻',
  ]
  pathPts.forEach((p, i) => {
    s.addText('◆', { x: 0.95, y: 3.05 + i * 0.55, w: 0.25, h: 0.4, fontSize: 9, color: C.gold })
    s.addText(p, { x: 1.25, y: 3.05 + i * 0.55, w: 5.0, h: 0.4, fontSize: 10.5, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })

  // 右：活化实验室
  s.addShape(pptx.ShapeType.roundRect, { x: 6.85, y: 2.3, w: 5.8, h: 4.0, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1 })
  s.addText('活化实验室 · AI 生成', { x: 7.05, y: 2.45, w: 5.4, h: 0.45, fontSize: 16, color: C.red, bold: true, fontFace: FONT_SERIF })
  const labPts = [
    '方案类型 / 风格 / 受众三维可选',
    '文化护栏：生成内容须符合非遗内核',
    '四宫格分步引导，降低创作门槛',
    '历史方案本地存档，可回溯迭代',
    '把「了解」转化为「参与创造」',
  ]
  labPts.forEach((p, i) => {
    s.addText('◆', { x: 7.1, y: 3.05 + i * 0.55, w: 0.25, h: 0.4, fontSize: 9, color: C.red })
    s.addText(p, { x: 7.4, y: 3.05 + i * 0.55, w: 5.0, h: 0.4, fontSize: 10.5, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })
}

// ==================== 10. 挑战 + 档案 ====================
{
  const s = baseSlide(10, TOTAL)
  pageTitle(s, '非遗挑战 · 传承档案', 'CORE FEATURE 05')

  s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 2.3, w: 5.8, h: 4.0, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1 })
  s.addText('非遗挑战 · 游戏化学习', { x: 0.9, y: 2.45, w: 5.4, h: 0.45, fontSize: 16, color: C.teal, bold: true, fontFace: FONT_SERIF })
  const chPts = [
    '分主题答题，正确率环可视化',
    '传承徽章体系，激励持续挑战',
    '错题本记录薄弱项，针对性复习',
    '每日打卡，培养学习习惯',
  ]
  chPts.forEach((p, i) => {
    s.addText('◆', { x: 0.95, y: 3.1 + i * 0.6, w: 0.25, h: 0.4, fontSize: 9, color: C.teal })
    s.addText(p, { x: 1.25, y: 3.1 + i * 0.6, w: 5.0, h: 0.4, fontSize: 10.5, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })

  s.addShape(pptx.ShapeType.roundRect, { x: 6.85, y: 2.3, w: 5.8, h: 4.0, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.1 })
  s.addText('传承档案 · 学习画像', { x: 7.05, y: 2.45, w: 5.4, h: 0.45, fontSize: 16, color: C.goldDim, bold: true, fontFace: FONT_SERIF })
  const pfPts = [
    '浏览 / 计划 / 测验 / 创作 四类埋点',
    '自动生成个人兴趣画像',
    '学习路径据此个性化推荐',
    '成长轨迹可视化，见证传承之路',
  ]
  pfPts.forEach((p, i) => {
    s.addText('◆', { x: 7.1, y: 3.1 + i * 0.6, w: 0.25, h: 0.4, fontSize: 9, color: C.goldDim })
    s.addText(p, { x: 7.4, y: 3.1 + i * 0.6, w: 5.0, h: 0.4, fontSize: 10.5, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })
}

// ==================== 11. 知识库与数据 ====================
{
  const s = baseSlide(11, TOTAL)
  pageTitle(s, '知识库 · 全量可信', 'KNOWLEDGE BASE')

  const data = [
    { n: '3299', l: '项国家级非遗名录\n全量结构化收录', c: C.gold },
    { n: '49', l: '项「苏绣级」深读档案\n钩子/冷知识/时间线/代表作', c: C.red },
    { n: '15', l: '个省级行政区\n深读项目地域覆盖', c: C.teal },
    { n: '100%', l: '配图覆盖 + 版权标注\ncredits.json 逐张记录许可', c: C.goldDim },
  ]
  data.forEach((d, i) => {
    const x = 0.7 + i * 3.1
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.3, w: 2.8, h: 2.4, fill: { color: C.ink2 }, line: { color: d.c, width: 0.75 }, rectRadius: 0.1 })
    s.addText(d.n, { x, y: 2.5, w: 2.8, h: 0.9, fontSize: 38, color: d.c, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addShape(pptx.ShapeType.line, { x: x + 0.7, y: 3.5, w: 1.4, h: 0, line: { color: d.c, width: 1 } })
    s.addText(d.l, { x: x + 0.2, y: 3.65, w: 2.4, h: 1.0, fontSize: 10, color: C.muted, fontFace: FONT_SANS, align: 'center', valign: 'top', lineSpacingMultiple: 1.4 })
  })

  s.addText('信源原则', { x: 0.9, y: 5.1, w: 3, h: 0.4, fontSize: 16, color: C.gold, bold: true, fontFace: FONT_SERIF })
  const sources = [
    '中国非物质文化遗产网 · 中国政府网 · 光明日报等权威出处',
    '每条 AI 回答附「来源 + 证据分」，可溯源、不编造',
    '配图采用 Commons 实拍 + 程序生成纹样字卡，许可如实声明',
    '宁缺毋滥：不确定的内容不写，空缺用兜底如实标注',
  ]
  sources.forEach((src, i) => {
    s.addText('✓', { x: 0.95, y: 5.6 + i * 0.35, w: 0.3, h: 0.3, fontSize: 10, color: C.teal, fontFace: FONT_SERIF })
    s.addText(src, { x: 1.3, y: 5.6 + i * 0.35, w: 11.0, h: 0.3, fontSize: 10, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })
}

// ==================== 12. 技术架构 ====================
{
  const s = baseSlide(12, TOTAL)
  pageTitle(s, '技术架构', 'TECH STACK')

  const layers = [
    { name: '前端表现层', tech: 'React 19 · TypeScript · Vite · D3.js', color: C.gold },
    { name: 'AI 智能体层', tech: '多 Agent 协作 · Intent 识别 · RAG 检索 · 知识图谱', color: C.teal },
    { name: '大模型层', tech: 'DashScope qwen-plus（对话/生成） · text-embedding-v3（向量）', color: C.red },
    { name: '后端服务层', tech: 'FastAPI · PBKDF2 鉴权 · HMAC 令牌 · 会话/进度存储', color: C.goldDim },
    { name: '数据层', tech: '结构化 JSON 知识库 · 向量库 · 中国地图 GeoJSON · Commons 配图', color: C.muted },
  ]
  layers.forEach((l, i) => {
    const y = 2.3 + i * 0.82
    s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y, w: 3.2, h: 0.65, fill: { color: l.color }, line: { color: l.color }, rectRadius: 0.05 })
    s.addText(l.name, { x: 0.7, y, w: 3.2, h: 0.65, fontSize: 14, color: C.ink, bold: true, fontFace: FONT_SERIF, align: 'center', valign: 'middle' })
    s.addShape(pptx.ShapeType.roundRect, { x: 4.1, y, w: 8.4, h: 0.65, fill: { color: C.ink2 }, line: { color: C.line, width: 0.5 }, rectRadius: 0.05 })
    s.addText(l.tech, { x: 4.3, y, w: 8.0, h: 0.65, fontSize: 12, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
  })

  s.addText('架构亮点：前后端分离 · 多智能体编排 · RAG 增强 · 全量结构化数据 · 鉴权安全', {
    x: 0.7, y: 6.5, w: 11.9, h: 0.35, fontSize: 10, color: C.goldDim, fontFace: FONT_SANS, align: 'center', italic: true,
  })
}

// ==================== 13. 竞争优势 ====================
{
  const s = baseSlide(13, TOTAL)
  pageTitle(s, '为什么是承脉 AI', 'COMPETITIVE ADVANTAGE')

  const adv = [
    { t: '全量', d: '3299 项国家级名录全覆盖，竞品多为零散条目', c: C.gold },
    { t: '深度', d: '49 项深读档案，钩子/冷知识/数字亮点/时间线多维度', c: C.red },
    { t: '可信', d: 'AI 回答带来源 + 证据分，信源可核验、不编造', c: C.teal },
    { t: '闭环', d: '了解—理解—学习—参与—传播 完整传承链路', c: C.goldDim },
    { t: '多模态', d: '对话/图谱/地图/路径/实验/挑战/档案 七入口互达', c: C.gold },
    { t: '审美', d: '墨韵金典国风视觉，克制不炫技，高级有中国味', c: C.red },
  ]
  adv.forEach((a, i) => {
    const col = i % 3, row = Math.floor(i / 3)
    const x = 0.7 + col * 4.1
    const y = 2.3 + row * 2.0
    s.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.8, h: 1.75, fill: { color: C.ink2 }, line: { color: a.c, width: 0.5 }, rectRadius: 0.08 })
    s.addText(a.t, { x: x + 0.2, y: y + 0.15, w: 1.0, h: 0.5, fontSize: 22, color: a.c, bold: true, fontFace: FONT_SERIF })
    s.addShape(pptx.ShapeType.line, { x: x + 0.2, y: y + 0.7, w: 1.0, h: 0, line: { color: a.c, width: 1 } })
    s.addText(a.d, { x: x + 0.2, y: y + 0.8, w: 3.4, h: 0.85, fontSize: 10.5, color: C.muted, fontFace: FONT_SANS, valign: 'top', lineSpacingMultiple: 1.4 })
  })
}

// ==================== 14. 团队 ====================
{
  const s = baseSlide(14, TOTAL)
  pageTitle(s, '团队', 'TEAM')

  const members = [
    { name: '周子昊', role: 'AI / Agent 总工程师 + 前端 UI/UX', desc: 'qwen-plus · RAG · Agent · 知识图谱 · 页面与交互', c: C.gold },
    { name: '马占赟', role: '后端 / 数据 / 部署', desc: 'FastAPI · 数据管线 · Docker · 公网部署', c: C.teal },
    { name: '李思雨', role: '内容 / 质量', desc: '知识库内容编校与来源核验 · 用户体验测试 · 演示材料', c: C.red },
  ]
  members.forEach((m, i) => {
    const x = 0.9 + i * 4.1
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.5, w: 3.7, h: 3.4, fill: { color: C.ink2 }, line: { color: m.c, width: 0.75 }, rectRadius: 0.1 })
    // 头像占位
    s.addShape(pptx.ShapeType.ellipse, { x: x + 1.35, y: 2.75, w: 1.0, h: 1.0, fill: { color: m.c, transparency: 20 }, line: { color: m.c } })
    s.addText(m.name[0], { x: x + 1.35, y: 2.85, w: 1.0, h: 0.8, fontSize: 32, color: C.ink, bold: true, fontFace: FONT_SERIF, align: 'center', valign: 'middle' })
    s.addText(m.name, { x, y: 3.9, w: 3.7, h: 0.45, fontSize: 18, color: C.cream, bold: true, fontFace: FONT_SERIF, align: 'center' })
    s.addText(m.role, { x, y: 4.4, w: 3.7, h: 0.35, fontSize: 11, color: m.c, fontFace: FONT_SANS, align: 'center', charSpacing: 1 })
    s.addShape(pptx.ShapeType.line, { x: x + 1.35, y: 4.85, w: 1.0, h: 0, line: { color: m.c, width: 1 } })
    s.addText(m.desc, { x: x + 0.25, y: 4.95, w: 3.2, h: 0.9, fontSize: 10, color: C.muted, fontFace: FONT_SANS, align: 'center', valign: 'top', lineSpacingMultiple: 1.4 })
  })
}

// ==================== 15. 路线图 ====================
{
  const s = baseSlide(15, TOTAL)
  pageTitle(s, '演进路线', 'ROADMAP')

  const phases = [
    { phase: 'V1.0 已完成', items: ['3299 项名录结构化', '10 页核心功能上线', '三视角 AI 对话', '知识图谱 + 地图'], c: C.teal },
    { phase: 'V1.5 进行中', items: ['索引层深读全量升级', '配图三层管线补全', '向量库全量重建', '公网部署上线'], c: C.gold },
    { phase: 'V2.0 规划', items: ['传承人入驻与认证', '非遗短视频 AI 生成', '社交传播与社区', '多端（小程序/APP）'], c: C.red },
  ]
  phases.forEach((p, i) => {
    const x = 0.7 + i * 4.15
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.5, w: 3.8, h: 3.6, fill: { color: C.ink2 }, line: { color: p.c, width: 0.75 }, rectRadius: 0.1 })
    s.addShape(pptx.ShapeType.rect, { x, y: 2.5, w: 3.8, h: 0.5, fill: { color: p.c }, line: { color: p.c } })
    s.addText(p.phase, { x, y: 2.5, w: 3.8, h: 0.5, fontSize: 14, color: C.ink, bold: true, fontFace: FONT_SERIF, align: 'center', valign: 'middle' })
    p.items.forEach((it, j) => {
      s.addText('▸', { x: x + 0.25, y: 3.25 + j * 0.6, w: 0.3, h: 0.4, fontSize: 12, color: p.c, fontFace: FONT_SERIF })
      s.addText(it, { x: x + 0.55, y: 3.25 + j * 0.6, w: 3.0, h: 0.4, fontSize: 11, color: C.cream, fontFace: FONT_SANS, valign: 'middle' })
    })
  })
}

// ==================== 16. 结尾 ====================
{
  const s = pptx.addSlide()
  s.background = { color: C.ink }
  s.addShape(pptx.ShapeType.line, { x: 4.5, y: 2.8, w: 4.33, h: 0, line: { color: C.gold, width: 1 } })
  s.addText('承脉 AI', {
    x: 0.5, y: 3.0, w: 12.33, h: 0.9, fontSize: 44, color: C.gold, bold: true, fontFace: FONT_SERIF, align: 'center', charSpacing: 12,
  })
  s.addText('让 AI 读懂非遗，让年轻人成为传承者', {
    x: 0.5, y: 4.0, w: 12.33, h: 0.5, fontSize: 16, color: C.cream, fontFace: FONT_SANS, align: 'center', charSpacing: 4,
  })
  s.addShape(pptx.ShapeType.line, { x: 4.5, y: 4.65, w: 4.33, h: 0, line: { color: C.gold, width: 1 } })
  s.addText('感谢聆听 · 敬请指正', {
    x: 0.5, y: 5.0, w: 12.33, h: 0.4, fontSize: 13, color: C.muted, fontFace: FONT_SANS, align: 'center', charSpacing: 6,
  })
  s.addText('github.com/zzh705/chengmai-ai', {
    x: 0.5, y: 6.4, w: 12.33, h: 0.3, fontSize: 10, color: C.goldDim, fontFace: FONT_SANS, align: 'center',
  })
}

// ========== 输出 ==========
await pptx.writeFile({ fileName: '承脉AI_路演演示.pptx' })
console.log('✅ 已生成: 承脉AI_路演演示.pptx')
