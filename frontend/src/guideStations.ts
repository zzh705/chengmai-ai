/**
 * 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
 * 站台数据表：新手指引十一站的文案、站色、站台照片与揭幕转场视觉，
 * Guide 页与 App 揭幕转场共用同一份数据（单一事实来源）。
 */
import photoHome from './assets/guide/s1.jpg'
import photoChat from './assets/guide/s2.jpg'
import photoKnowledge from './assets/guide/s3.jpg'
import photoGraph from './assets/guide/s4.jpg'
import photoMap from './assets/guide/s5.jpg'
import photoMasters from './assets/guide/s6.jpg'
import photoPath from './assets/guide/s7.jpg'
import photoLab from './assets/guide/s8.jpg'
import photoChallenge from './assets/guide/s9.jpg'
import photoProfile from './assets/guide/s10.jpg'
import photoAbout from './assets/guide/s11.jpg'

/** 版面四式：scroll 卷轴批注 / ink 墨戏散点 / steps 书山台阶 / map 舆图方格，十一站交替不重样 */
export type Variant = 'scroll' | 'ink' | 'steps' | 'map'

export interface GuideStep {
  page: string
  title: string
  /** 导航条短名 */
  short: string
  /** 一句话定位 */
  tag: string
  line: string
  points: string[]
  /** 四字点睛，随版面以竖批/水印/书签/方志形式出现 */
  hook: string
  /** 印章字（缩小为照片角章） */
  seal: string
  sealNote: string
  /** 站台主色（CSS 变量名）：卡顶线、标签、按钮、照片光晕、进度灯共用 */
  tone: string
  /** 灯笼悬灯颜色（随主题自适应的 rgba），与站色同源 */
  lantern: string
  /** 揭幕转场主色（hex），跳转到功能页时与灯笼同色同脉 */
  hexb: string
  img: string
  variant: Variant
}

/** 十一站：按主站导航序层层递进，每站一张专属照片、一式专属版面，文案与页面实况一一对应 */
export const STEPS: GuideStep[] = [
  {
    page: 'home',
    title: '首页',
    short: '首页',
    tag: '门面',
    line: '大门一开，十一处胜景全在檐下。先在前厅落座：看灯、看讯、看山河，一样都别落下。',
    points: [
      '「问 AI」一句话，全馆的引路官随叫随到',
      '今日非遗 · 一分钟速览，从悬念走进真章',
      '地域探索一眼望尽九州分布，热度深浅分明',
      '我的学习进度，把今天的脚印收进首页',
    ],
    hook: '开卷见山',
    seal: '启',
    sealNote: '开卷见山',
    tone: 'var(--vermilion)',
    lantern: 'rgba(var(--red-rgb), 0.5)',
    hexb: '#b03a2e',
    img: photoHome,
    variant: 'scroll',
  },
  {
    page: 'chat',
    title: '承脉 AI',
    short: '承脉AI',
    tag: '三释',
    line: '三位先生并坐堂中：学者引经、传承人说艺、青年讲新。问什么，都有来处。',
    points: [
      '学者 / 传承人 / 青年传播者，一键换座，三味答法',
      '回答一字一字写给你看，句句挂出来源依据',
      '从首页、名家页带问题进来，坐下即问',
      '追问到底，话头接着聊，不打断思路',
    ],
    hook: '三声有答',
    seal: '问',
    sealNote: '三声各有答',
    tone: 'var(--jade)',
    lantern: 'rgba(var(--jade-rgb), 0.55)',
    hexb: '#4f8f7b',
    img: photoChat,
    variant: 'ink',
  },
  {
    page: 'knowledge',
    title: '非遗知识库',
    short: '知识库',
    tag: '深读',
    line: '三千二百九十九项名录尽数归档。想查哪一项，喊一声，或自己动手翻。',
    points: [
      '关键词一搜即中，十大类随你筛选',
      '深读档案：钩子、工序、时间线与文化内涵',
      '语音讲解随点随停，读到哪记到哪',
    ],
    hook: '下笔知来处',
    seal: '读',
    sealNote: '下笔知来处',
    tone: 'var(--gold)',
    lantern: 'rgba(var(--gold-rgb), 0.42)',
    hexb: '#c19a45',
    img: photoKnowledge,
    variant: 'map',
  },
  {
    page: 'graph',
    title: '知识图谱',
    short: '图谱',
    tag: '族谱',
    line: '一张会呼吸的族谱：从根出发，枝蔓一路牵到人。关系触手可及。',
    points: [
      '根 → 十大类 → 项目 → 传承人，四级层层舒展',
      '拖拽、缩放、搜索，一点即见节点详情',
      '三千星尘环带，是全量收录的星野预告',
    ],
    hook: '千丝一线牵',
    seal: '系',
    sealNote: '千丝一线牵',
    tone: 'var(--viz-indigo)',
    lantern: 'rgba(96, 112, 152, 0.55)',
    hexb: '#56688f',
    img: photoGraph,
    variant: 'steps',
  },
  {
    page: 'map',
    title: '非遗地图',
    short: '地图',
    tag: '舆图',
    line: '沿着华夏地理铺开，哪片土地藏着什么老手艺，一眼便有分晓。',
    points: [
      '舆图与方格双视图，山河形胜任你切换',
      '点选省份，热度成色、名录多少即刻示下',
      '「带我去一个省」，说走就走的云端采风',
    ],
    hook: '舆图入九州',
    seal: '览',
    sealNote: '舆图入九州',
    tone: 'var(--jade)',
    lantern: 'rgba(var(--jade-rgb), 0.55)',
    hexb: '#4f8f7b',
    img: photoMap,
    variant: 'scroll',
  },
  {
    page: 'masters',
    title: '名家风采',
    short: '名家',
    tag: '溯源',
    line: '十六位开宗立派之人，是星河里的北斗。先认得他们，再望万千星辰。',
    points: [
      '肖像、生平年表与代表作品，逐位深读',
      '每位一盏灯，点亮方法与门派的来路',
      '「向承脉 AI 问起」，把好奇续进对话',
      '戏台上下，传承从来都是一句一句唱出来的',
    ],
    hook: '星河识北斗',
    seal: '仰',
    sealNote: '星河识北斗',
    tone: 'var(--vermilion)',
    lantern: 'rgba(var(--red-rgb), 0.5)',
    hexb: '#b03a2e',
    img: photoMasters,
    variant: 'ink',
  },
  {
    page: 'path',
    title: '学习路径',
    short: '路径',
    tag: '精进',
    line: '把兴趣排成一条上山的路：一天一坎，走到山顶自有风景。',
    points: [
      '输入主题，选天数、目标与每日时长',
      '一键生成分日计划：日卡打卡、里程碑递进',
      '「抄录路线」，整案带进课堂与社团',
    ],
    hook: '书山自卷开',
    seal: '行',
    sealNote: '书山自卷开',
    tone: 'var(--gold)',
    lantern: 'rgba(var(--gold-rgb), 0.42)',
    hexb: '#c19a45',
    img: photoPath,
    variant: 'steps',
  },
  {
    page: 'lab',
    title: '活化实验室',
    short: '实验室',
    tag: '活化',
    line: '老手艺不是藏品，是活水。给一个念头，还你一套新世代的方案。',
    points: [
      '选定非遗、写下需求，方案即刻生成',
      '文案、活动、短视频，多种形制任选',
      '风格受众皆可定制，历史方案随时回查',
    ],
    hook: '古艺焕新枝',
    seal: '创',
    sealNote: '古艺焕新枝',
    tone: 'var(--viz-indigo)',
    lantern: 'rgba(96, 112, 152, 0.55)',
    hexb: '#56688f',
    img: photoLab,
    variant: 'map',
  },
  {
    page: 'challenge',
    title: '非遗挑战',
    short: '挑战',
    tag: '试锋',
    line: '读了一路，手痒没有？每日一题，三题一试，见见真章。',
    points: [
      '每日一题：AI 现场出题，即答即评',
      '五款迷你游艺坊，边玩边长见识',
      '连对与打卡联动，攒下六枚传承徽章',
    ],
    hook: '三题试锋芒',
    seal: '试',
    sealNote: '三题试锋芒',
    tone: 'var(--vermilion)',
    lantern: 'rgba(var(--red-rgb), 0.5)',
    hexb: '#b03a2e',
    img: photoChallenge,
    variant: 'ink',
  },
  {
    page: 'profile',
    title: '个人中心',
    short: '个人',
    tag: '档案',
    line: '走过的每一步都不白走：此页有你的名号、印章与全部足迹。',
    points: [
      '传承人名片与称号之路，成长看得见',
      '集印册八枚印章，达成条件即盖印',
      '兴趣雷达、答题分析与浏览足迹，一页复盘',
    ],
    hook: '印留岁月痕',
    seal: '籍',
    sealNote: '印留岁月痕',
    tone: 'var(--gold)',
    lantern: 'rgba(var(--gold-rgb), 0.42)',
    hexb: '#c19a45',
    img: photoProfile,
    variant: 'map',
  },
  {
    page: 'about',
    title: '关于项目',
    short: '关于',
    tag: '立心',
    line: '承脉的来路、架构与许可，全部公开可验——这是立身之本。',
    points: [
      '项目简介与设计理念，看清承脉的来路',
      '系统架构与多智能体分工，口径公开可查',
      '数据与图片许可逐条可验，里程碑一路走来',
    ],
    hook: '一脉承至今',
    seal: '承',
    sealNote: '一脉承至今',
    tone: 'var(--jade)',
    lantern: 'rgba(var(--jade-rgb), 0.55)',
    hexb: '#4f8f7b',
    img: photoAbout,
    variant: 'steps',
  },
]

/**
 * 揭幕转场视觉表：App 从 guide 跳到功能页（或回 guide）时，
 * 按所在站次取照片与站色，做「双扇揭幕·照片现景」的全屏转场。
 */
export const GUIDE_VEILS = STEPS.map((s) => ({ img: s.img, a: '#e8c56b', b: s.hexb }))