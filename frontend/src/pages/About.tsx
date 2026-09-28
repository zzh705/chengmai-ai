import { useEffect, useState } from 'react'
import { fetchHeritageList } from '../api/heritage'
import { extractProvince } from '../utils/geo'
import '../styles/about.css'

/** 目录锚点：点击平滑滚动到对应分区 */
const SECTIONS = [
  ['intro', '简介'],
  ['idea', '理念'],
  ['arch', '架构'],
  ['ai', 'AI 说明'],
  ['data', '数据'],
  ['quality', '测试'],
  ['timeline', '里程碑'],
  ['team', '团队'],
] as const

const AGENTS = [
  { n: '意图识别', d: '判断闲聊/检索/任务，分发给下游智能体' },
  { n: '检索问答', d: '关键词+语义混合检索，附证据分与来源' },
  { n: '学习规划', d: '按主题与天数生成可执行的学习路线' },
  { n: '活化创作', d: '文化护栏下的创意方案生成（四宫格+步骤）' },
  { n: '故事生成', d: '面向不同受众改写非遗故事' },
  { n: '测验出题', d: '依据知识库出题并判分解析' },
]

const TECH = [
  'Python 3.11',
  'FastAPI',
  'Qwen3 大模型',
  'text-embedding-v3 语义检索',
  'D3.js 知识图谱 + d3-geo 非遗地图',
  'React 19 + TypeScript + Vite',
  '混合检索（关键词 + 向量）',
  '证据分与来源溯源',
  '用户进度与传承档案',
  'oxlint 零警告 + pytest 8 用例',
  'Playwright 端到端回归',
]

export default function About() {
  // 关键数字实时拉取：数据更新后页面无需改代码
  const [stat, setStat] = useState({ items: 0, provs: 0, nodes: 0, links: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchHeritageList(),
      fetch('/api/graph')
        .then((r) => r.json())
        .catch(() => ({ nodes: [], links: [] })),
    ])
      .then(([list, graph]) => {
        const provs = new Set(
          list
            .map((h) => extractProvince(h.region))
            .filter((p) => p !== '全国' && p !== '其他'),
        ).size
        setStat({
          items: list.length,
          provs,
          nodes: graph.nodes?.length ?? 0,
          links: graph.links?.length ?? 0,
        })
      })
      .catch(() => undefined)
      .finally(() => setReady(true))
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const num = (v: number) => (ready ? String(v) : '—')

  return (
    <div className="ab-page">
      <header className="ab-header" id="intro">
        <div className="ab-seal">承脉</div>
        <h1>关于承脉 AI</h1>
        <p>面向文化理解与传播的非遗多智能体系统</p>
      </header>

      {/* 目录导航（吸顶） */}
      <nav className="ab-nav">
        {SECTIONS.map(([id, label]) => (
          <button key={id} onClick={() => scrollTo(id)}>
            {label}
          </button>
        ))}
      </nav>

      <section className="ab-card ab-intro">
        <h3>项目简介</h3>
        <p>
          承脉 AI
          面向青少年与海外中文学习者，围绕国家级非物质文化遗产提供“检索问答、知识图谱、非遗地图、学习路径、
          活化创作、知识挑战”六位一体的服务。系统以可溯源的结构化知识库为底座，以多智能体协作为核心，
          让每一次回答都带来源，让每一份创作都有依据，让学习进度可记录、可展示。
        </p>
        <div className="ab-nums">
          <div>
            <em>{num(stat.items)}</em>
            <span>国家级非遗项目</span>
          </div>
          <div>
            <em>{num(stat.provs)}</em>
            <span>覆盖省级行政区</span>
          </div>
          <div>
            <em>{num(stat.nodes)}</em>
            <span>图谱节点</span>
          </div>
          <div>
            <em>{num(stat.links)}</em>
            <span>知识关系</span>
          </div>
        </div>
      </section>

      <section className="ab-card" id="idea">
        <h3>设计理念</h3>
        <div className="ab-idea">
          <div>
            <strong>可溯源</strong>
            <span>
              回答必附来源与证据分，知识库逐条标注中国非物质文化遗产网、UNESCO
              等权威出处——先解决“信不信”，再谈“好不好玩”。
            </span>
          </div>
          <div>
            <strong>可参与</strong>
            <span>
              学习路径、知识挑战、传承档案把“看展式浏览”变成“打卡式学习”，
              进度可记录、徽章可展示，青少年愿意反复回来。
            </span>
          </div>
          <div>
            <strong>可创造</strong>
            <span>
              活化实验室在文化护栏下生成四宫格创意方案，让非遗不止于知识，
              而成为可以被当代生活重新使用的素材。
            </span>
          </div>
        </div>
      </section>

      <section className="ab-card" id="arch">
        <h3>系统架构</h3>
        <div className="ab-flow">
          <div className="ab-flow-row">
            <span className="ab-flow-node in">用户提问 / 点击探索</span>
          </div>
          <div className="ab-flow-arrow" aria-hidden>
            ↓
          </div>
          <div className="ab-flow-row">
            <span className="ab-flow-node gate">意图识别智能体</span>
          </div>
          <div className="ab-flow-arrow" aria-hidden>
            ↓
          </div>
          <div className="ab-flow-row ab-flow-agents">
            <span className="ab-flow-node">检索问答</span>
            <span className="ab-flow-node">学习规划</span>
            <span className="ab-flow-node">活化创作</span>
            <span className="ab-flow-node">故事 / 测验</span>
          </div>
          <div className="ab-flow-arrow" aria-hidden>
            ↓
          </div>
          <div className="ab-flow-row">
            <span className="ab-flow-node base">混合检索引擎（关键词 + 向量）</span>
          </div>
          <div className="ab-flow-arrow" aria-hidden>
            ↓
          </div>
          <div className="ab-flow-row">
            <span className="ab-flow-node out">结构化知识库 · 来源库 · 用户进度</span>
          </div>
        </div>
        <p className="ab-flow-note">
          前端（React + D3）与后端（FastAPI）通过
          <code>/api</code> 合同通信；智能体只读取检索到的证据，不凭参数记忆作答。
        </p>
      </section>

      <section className="ab-card">
        <h3>多智能体架构</h3>
        <div className="ab-agents">
          {AGENTS.map((a) => (
            <div key={a.n} className="ab-agent">
              <strong>{a.n}</strong>
              <span>{a.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-card" id="ai">
        <h3>AI 使用说明与防幻觉设计</h3>
        <ul className="ab-list">
          <li>
            <strong>模型与能力：</strong>
            对话与生成类能力使用 Qwen3（DashScope API），语义检索使用 text-embedding-v3
            向量化；两者均在后端服务端调用，前端不接触任何密钥。
          </li>
          <li>
            <strong>检索增强（RAG）：</strong>
            用户问题先做关键词与向量混合检索，取回最相关的知识块作为上下文，
            提示词明确要求“只依据给定资料回答，资料不足就说不知道”。
          </li>
          <li>
            <strong>证据分与来源：</strong>
            每次回答对命中片段计算证据分，低于阈值时降级为“未找到可靠依据”，
            回答中逐条列出来源名称与可信度（official / academic / reference）。
          </li>
          <li>
            <strong>生成类护栏：</strong>
            活化创作与故事生成先经过文化语义检查，禁止戏说核心信仰与仪式；
            出题智能体只允许从知识库字段中抽题，避免编造史实。
          </li>
          <li>
            <strong>人机协作：</strong>
            AI 负责初稿与检索，团队成员负责史实与来源复核（李思雨），
            所有结构化字段上线前逐条核对。
          </li>
        </ul>
      </section>

      <section className="ab-card">
        <h3>技术栈</h3>
        <div className="ab-tags">
          {TECH.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section className="ab-card" id="data">
        <h3>数据与来源</h3>
        <p>
          知识库收录 <strong>{num(stat.items)}</strong> 项国家级非遗代表性项目（覆盖{' '}
          <strong>{num(stat.provs)}</strong> 个省级行政区、7
          个非遗大类），结构化字段（简介、文化内涵、技艺工序、代表作品、代表性传承人）
          逐条标注来源（中国非物质文化遗产网、UNESCO、中国民俗学网等），
          并配有来自 Wikimedia Commons 的自由许可图片；回答中以「来源」与「证据分」
          双重呈现可信度。数据仅用于教学演示，正式发布前将按赛制要求做权威信源核验。
        </p>
      </section>

      <section className="ab-card">
        <h3>合规与开源说明</h3>
        <ul className="ab-list">
          <li>
            <strong>图片版权：</strong>
            全部配图来自 Wikimedia Commons，许可为 CC0 / CC BY / CC BY-SA / Public
            Domain，逐张记录于 <code>credits.json</code>（含许可与原始文件名）。
          </li>
          <li>
            <strong>数据来源：</strong>
            项目信息整理自中国非物质文化遗产网（文化和旅游部主管）、UNESCO
            代表作名录、中国民俗学网等公开权威资料，仅用于教学演示与比赛展示。
          </li>
          <li>
            <strong>开源组件：</strong>
            React、FastAPI、D3.js、Vite 等均为开源许可组件，遵循其 LICENSE 使用；
            本项目源码将随比赛材料一并提交。
          </li>
          <li>
            <strong>密钥安全：</strong>
            API 密钥仅存放于服务端环境变量（.env，已列入 .gitignore），仓库与前端产物中不含任何密钥。
          </li>
        </ul>
      </section>

      <section className="ab-card" id="quality">
        <h3>测试与质量</h3>
        <div className="ab-quality">
          <div>
            <em>8</em>
            <span>后端 pytest 用例</span>
          </div>
          <div>
            <em>0</em>
            <span>oxlint 警告 / 错误</span>
          </div>
          <div>
            <em>E2E</em>
            <span>Playwright 全流程回归</span>
          </div>
          <div>
            <em>3</em>
            <span>页面端到端跳转链路</span>
          </div>
        </div>
        <p className="ab-quality-note">
          回归覆盖：知识库搜索与详情直达、图谱六类节点面板与跨页跳转、地图省份联动、
          hover 高亮与图例隐藏、缩放复位；控制台零报错即通过。
        </p>
      </section>

      <section className="ab-card" id="timeline">
        <h3>里程碑</h3>
        <ul className="ab-timeline">
          <li>
            <span className="tl-when">阶段一</span>
            <strong>工程骨架与知识底座</strong>
            <span>FastAPI + React 骨架、检索问答与来源引用、知识库首批内容与配图</span>
          </li>
          <li>
            <span className="tl-when">阶段二</span>
            <strong>多智能体与学习系统</strong>
            <span>意图路由、学习路径、活化创作、知识挑战、进度与传承档案</span>
          </li>
          <li>
            <span className="tl-when">阶段三</span>
            <strong>图谱 · 地图 · 视觉语言</strong>
            <span>知识图谱与跨页联动、非遗地图可视化、回纹金线中国风设计体系</span>
          </li>
          <li>
            <span className="tl-when">阶段四</span>
            <strong>铺满全国与体验打磨</strong>
            <span>
              知识库扩至 {stat.items || '43'} 项覆盖 {stat.provs || '33'}
              省级行政区、地图数据大屏、骨架屏与端到端回归
            </span>
          </li>
        </ul>
      </section>

      <section className="ab-card" id="team">
        <h3>团队分工</h3>
        <div className="ab-team">
          <div>
            <strong>周子昊</strong>
            <span>AI 算法 / 多智能体架构 / 前端与交互设计</span>
          </div>
          <div>
            <strong>马占赟</strong>
            <span>后端服务 / 数据处理 / 部署运维</span>
          </div>
          <div>
            <strong>李思雨</strong>
            <span>知识库内容编校与来源核验 / 用户体验测试 / 演示与汇报材料</span>
          </div>
        </div>
      </section>

      <footer className="ab-footer">CHENGMAI · 让千年非遗被这一代人接住</footer>
    </div>
  )
}
