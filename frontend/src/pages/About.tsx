import { useCallback, useEffect, useState } from 'react'
import CountUp from '../components/CountUp'
import { useRevealGroup } from '../hooks/useReveal'
import { fetchHeritageList, type HeritageSummary } from '../api/heritage'
import type { GraphData, GraphNode } from '../api/graph'
import { fetchFullGraph } from '../api/graph'
import { extractProvince } from '../utils/geo'
import '../styles/about.css'

/** 目录锚点：点击平滑滚动到对应分区 */
const SECTIONS = [
  ['why', '初心'],
  ['intro', '简介'],
  ['idea', '理念'],
  ['arch', '架构'],
  ['ai', 'AI 说明'],
  ['data', '数据'],
  ['quality', '测试'],
  ['timeline', '里程碑'],
  ['team', '团队'],
  ['advisor', '指导教师'],
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
  'qwen-plus 大模型（DashScope）',
  'text-embedding-v3 语义检索',
  'D3.js 知识图谱 + d3-geo 非遗地图',
  'React 19 + TypeScript + Vite',
  '混合检索（关键词 + 向量）',
  '证据分与来源溯源',
  '用户进度与传承档案',
  'oxlint 零警告 + pytest 8 用例',
  'Playwright 端到端回归',
]

/** 初心叙事：逐行浮现（c 为强调行样式名） */
const WHY_LINES: { t: string; c?: string }[] = [
  { t: '有些东西，是在没有人注意的时候消失的。' },
  { t: '没有告别，也没有掌声。只有一位老师傅轻轻关上了身后的门。门后面，是一千年。' },
  { t: '名录上的一行字，背后也许只剩最后一位还会这门手艺的人。他没有学生，也没有第二段人生，可以再教一遍。' },
  { t: '我们做承脉 AI，是害怕这种安静。', c: 'turn' },
  { t: '怕它消失得太体面、太沉默，沉默到我们后来才想起来：曾经有人用了一生，只为把一样东西交出去。' },
  { t: '于是我们把它放到这代人每天都在的地方：问一句就有答案，走一步就有记录，动一次手就能留下作品。', c: 'turn' },
  { t: '让非遗重新被人看见、被人问起、被人拿去用。' },
  { t: '传承不是把过去供起来，而是让它还有明天。', c: 'last' },
]

/** 传承人名录条目：拆出括号内的称号，名与项目分别呈现 */
interface InheritorEntry {
  name: string
  title?: string
  project: string
  projectId: string
  hook: string
}

/** 把后端图谱（关联传承人 link）与非遗清单拼成名录条目 */
function buildInheritors(
  list: HeritageSummary[],
  graph: GraphData,
): InheritorEntry[] {
  const deep = list.filter((h) => h.tier !== 'index')
  const heritageById = new Map(deep.map((h) => [h.id, h]))
  const personById = new Map<string, GraphNode>(
    (graph.nodes ?? []).filter((n) => n.type === 'person').map((n) => [n.id, n]),
  )
  const out: InheritorEntry[] = []
  for (const link of graph.links ?? []) {
    if (link.relation !== '关联传承人') continue
    const h = heritageById.get(link.source)
    const p = personById.get(link.target)
    if (!h || !p) continue
    const m = p.label.match(/^([^（()]+)[（(]([^）)]+)[）)]/)
    if (m) {
      out.push({ name: m[1].trim(), title: m[2].trim(), project: h.name, projectId: h.id, hook: h.hook })
    } else {
      out.push({ name: p.label, project: h.name, projectId: h.id, hook: h.hook })
    }
  }
  return out
}

export default function About() {
  // 关键数字实时拉取：数据更新后页面无需改代码
  const [stat, setStat] = useState({ items: 0, deep: 0, provs: 0, nodes: 0, links: 0 })
  const [inheritors, setInheritors] = useState<InheritorEntry[]>([])
  const [ready, setReady] = useState(false)
  // 接口失败不再静默显示 0：置错误标记，统计区显「数据暂不可用」+ 重试
  const [failed, setFailed] = useState(false)
  const rootRef = useRevealGroup<HTMLDivElement>([ready])

  const load = useCallback(() => {
    Promise.all([
      fetchHeritageList(),
      fetchFullGraph()
        .catch(() => ({ nodes: [], links: [] })) as Promise<GraphData>,
    ])
      .then(([list, graph]) => {
        // 计数口径：只计在册深读项（tier !== 'index'），与「国家级非遗项目」页面文字一致
        const deep = list.filter((h) => h.tier !== 'index')
        const provs = new Set(
          list
            .map((h) => extractProvince(h.region))
            .filter((p) => p !== '全国' && p !== '其他'),
        ).size
        setInheritors(buildInheritors(list, graph))
        setStat({
          items: deep.length,
          deep: deep.length,
          provs,
          nodes: graph.nodes?.length ?? 0,
          links: graph.links?.length ?? 0,
        })
      })
      .catch(() => setFailed(true))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** 重试：先在事件里复位状态，再重新拉取 */
  function retry() {
    setFailed(false)
    setReady(false)
    load()
  }

  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  const num = (v: number) => (failed ? '…' : ready ? String(v) : '0')

  /** 名录条目：第二份仅为无缝横移复制，对辅助技术隐藏；错落低位用索引类保证双份一致 */
  const renderInheritor = (it: InheritorEntry, key: string, duplicated = false, index = 0) => (
    <article
      key={key}
      className={`ab-inheritor${index % 2 === 1 ? ' ab-inheritor-low' : ''}${duplicated ? ' ab-inheritor-dup' : ''}`}
      title={`${it.name} · ${it.project}`}
      aria-hidden={duplicated || undefined}
    >
      <div className="ab-inheritor-top">
        <span className="ab-inheritor-seal" aria-hidden>
          {it.name[0]}
        </span>
        <span className="ab-inheritor-name">{it.name}</span>
        {it.title && <span className="ab-inheritor-title">{it.title}</span>}
      </div>
      <span className="ab-inheritor-proj">{it.project}</span>
      <p className="ab-inheritor-hook">{it.hook}</p>
    </article>
  )

  return (
    <div className="ab-page" ref={rootRef}>
      {/* 两侧竖排边饰：留白处的卷轴气质（宽屏显示，纯装饰） */}
      <div className="ab-rail ab-rail-left" aria-hidden>
        <span className="ab-rail-mark">承脉</span>
        <i className="ab-rail-line" />
        <span className="ab-rail-text">凡有来处 · 皆有回响</span>
        <i className="ab-rail-line" />
        <span className="ab-rail-mark ab-rail-mark-sm">非遗</span>
      </div>
      <div className="ab-rail ab-rail-right" aria-hidden>
        <span className="ab-rail-text">让非遗被看见 · 被问起 · 被用起来</span>
        <i className="ab-rail-line" />
        <span className="ab-rail-mark ab-rail-mark-sm">日新</span>
        <i className="ab-rail-line" />
        <span className="ab-rail-text ab-rail-text-dim">守正 · 创新</span>
      </div>
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

      {/* 初心：动情叙事 + 传承人名录（横卷徐行） */}
      <section className="ab-card ab-why reveal" id="why">
        <span className="ab-why-kicker">初心</span>
        <div className="ab-why-lines">
          {WHY_LINES.map((l, i) => (
            <p
              key={i}
              className={`reveal ${l.c ?? ''}`}
              style={{ transitionDelay: `${0.08 + i * 0.12}s` }}
            >
              {l.t}
            </p>
          ))}
        </div>

        {/* 传承人名录：横卷徐行，名在卷上、项目悬腕，皆指向真实的人 */}
        <div className="ab-why-inheritors">
          <div className="ab-why-inheritors-head">
            <span>传承人名录</span>
            <em>
              {failed
                ? '名录数据暂不可用'
                : `${num(inheritors.length)} 位代表 · 此刻仍在执笔传习`}
            </em>
          </div>
          {inheritors.length > 0 && !failed && (
            <div className="ab-inheritors-viewport">
              <div className="ab-inheritors-track">
                {inheritors.map((it, i) => renderInheritor(it, `a${i}`, false, i))}
                {inheritors.map((it, i) => renderInheritor(it, `b${i}`, true, i))}
              </div>
            </div>
          )}
          <p className="ab-why-inheritors-note">
            横卷上缓缓走过的每一位，都是非物质文化遗产代表性传承人。姓名、称号与所承项目均取自公开的官方名录，
            由知识图谱中的人物关系与深读档案逐条对应生成，没有一个名字是凭空写下的。悬停时卷轴会停下来，
            好让每个名字都来得及读完。他们把一生交给一门手艺，我们至少把这一行名录读完整。
          </p>
        </div>

        <blockquote className="ab-why-sign">承脉 AI · 设计手记</blockquote>
      </section>

      <section className="ab-card reveal ab-intro">
        <h2>项目简介</h2>
        <p>
          承脉 AI
          面向青少年与海外中文学习者，围绕国家级非物质文化遗产提供“检索问答、知识图谱、非遗地图、学习路径、
          活化创作、知识挑战”六位一体的服务。系统以可溯源的结构化知识库为底座，以多智能体协作为核心，
          让每一次回答都带来源，让每一份创作都有依据，让学习进度可记录、可展示。
        </p>
        <div className="ab-nums">
          {failed ? (
            <div className="ab-nums-error" role="alert">
              <span>实时统计数据暂不可用</span>
              <button type="button" className="ab-retry" onClick={retry}>
                重试
              </button>
            </div>
          ) : (
            <>
              <div>
                <em>{ready ? <CountUp value={stat.items} /> : '0'}</em>
                <span>国家级非遗项目</span>
              </div>
              <div>
                <em>{ready ? <CountUp value={stat.provs} /> : '0'}</em>
                <span>覆盖省级行政区</span>
              </div>
              <div>
                <em>{ready ? <CountUp value={stat.nodes} /> : '0'}</em>
                <span>图谱节点</span>
              </div>
              <div>
                <em>{ready ? <CountUp value={stat.links} /> : '0'}</em>
                <span>知识关系</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="ab-card reveal" id="idea">
        <h2>设计理念</h2>
        <div className="ab-idea">
          <div>
            <strong>可溯源</strong>
            <span>
              回答必附来源与证据分，知识库逐条标注中国非物质文化遗产网、UNESCO
              等权威出处：先解决“信不信”，再谈“好不好玩”。
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

      <section className="ab-card reveal" id="arch">
        <h2>系统架构</h2>
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
            <span className="ab-flow-node out">结构化知识库、来源库、用户进度</span>
          </div>
        </div>
        <p className="ab-flow-note">
          前端（React + D3）与后端（FastAPI）通过
          <code>/api</code> 合同通信；智能体只读取检索到的证据，不凭参数记忆作答。
        </p>
      </section>

      <section className="ab-card reveal">
        <h2>多智能体架构</h2>
        <div className="ab-agents">
          {AGENTS.map((a) => (
            <div key={a.n} className="ab-agent">
              <strong>{a.n}</strong>
              <span>{a.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-card reveal" id="ai">
        <h2>AI 使用说明与防幻觉设计</h2>
        <ul className="ab-list">
          <li>
            <strong>模型与能力：</strong>
            对话与生成类能力使用 qwen-plus（DashScope API），语义检索使用 text-embedding-v3
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

      <section className="ab-card reveal">
        <h2>技术栈</h2>
        <div className="ab-tags">
          {TECH.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section className="ab-card reveal" id="data">
        <h2>数据与来源</h2>
        <p>
          知识库收录 <strong>{num(stat.items)}</strong> 项国家级非遗代表性项目（覆盖{' '}
          <strong>{num(stat.provs)}</strong> 个省级行政区、10
          个非遗大类），结构化字段（简介、文化内涵、技艺工序、代表作品、代表性传承人）
          逐条标注来源（中国非物质文化遗产网、UNESCO、中国民俗学网等）。
          配图按三层管线如实分层：优先采用开放许可实拍图；实拍确无可靠来源的长尾条目，
          使用通义万相文生图模型生成写实风格的<strong>场景示意图（非实景照片、不冒充实拍）</strong>；
          仍未覆盖的少量条目以程序生成的传统纹样字卡兜底，并在知识库列表中自动沉底、不做展示露出。
          回答中以「来源」与「证据分」
          双重呈现可信度。数据仅用于教学演示，正式发布前将按赛制要求做权威信源核验。
        </p>
      </section>

      <section className="ab-card reveal">
        <h2>合规与开源说明</h2>
        <ul className="ab-list">
          <li>
            <strong>实拍图片：</strong>
            来自 Wikimedia Commons、大都会艺术博物馆 Open Access、克利夫兰艺术博物馆
            Open Access 与 Openverse 聚合的开放许可素材，许可为 CC0 / CC BY / CC BY-SA /
            Public Domain / 博物馆 Open Access 等，逐张记录于{' '}
            <code>credits.json</code>（含来源平台、许可与原始文件名）。
          </li>
          <li>
            <strong>名家肖像：</strong>
            「名家风采」收录的十六位开宗立派名家，肖像均取自 Wikimedia Commons
            的公有领域历史影像或历史画像（其中荀慧生一张为 CC BY-SA 4.0，张明山一张为
            CC0），逐张人工核验为本人，模糊者仅做裁切与对比度修复，不做任何猜测性配图；
            原始文件名与许可记录于 <code>images/masters/credits.json</code>，
            并在每位名家的详情页逐张标注来源。
          </li>
          <li>
            <strong>AI 生成示意图：</strong>
            对严格相关性筛选后仍无靠谱实拍的长尾条目，使用阿里云百炼「通义万相」
            wanx2.1-t2i-turbo 文生图模型生成写实风格配图，仅作场景与氛围示意，
            <strong>不是真实影像、不冒充实拍、不对应真实在世人物</strong>；
            生成时以器物、双手、远景与侧逆光剪影为主，回避清晰人脸。
            每张均在 <code>credits.json</code> 中以{' '}
            <code>source: dashscope-wanx-ai</code> 标注并留存提示词，数量受模型免费额度上限约束。
          </li>
          <li>
            <strong>字卡兜底：</strong>
            实拍与 AI 示意图均未覆盖的少量条目，封面为本项目程序生成的传统纹样字卡
            （回纹、挑花格、旋纹等，不含第三方素材与人名信息），此类条目在知识库列表中
            自动沉底，常规浏览与首页推荐位均不露出。
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

      <section className="ab-card reveal" id="quality">
        <h2>测试与质量</h2>
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

      <section className="ab-card reveal" id="timeline">
        <h2>里程碑</h2>
        <ul className="ab-timeline">
          <li>
            <span className="tl-when">起步</span>
            <strong>工程骨架与知识底座</strong>
            <span>FastAPI + React 骨架、检索问答与来源引用、知识库首批内容与配图</span>
          </li>
          <li>
            <span className="tl-when">扩展</span>
            <strong>多智能体与学习系统</strong>
            <span>意图路由、学习路径、活化创作、知识挑战、进度与传承档案</span>
          </li>
          <li>
            <span className="tl-when">可视化</span>
            <strong>图谱、地图、视觉语言</strong>
            <span>知识图谱与跨页联动、非遗地图可视化、回纹金线中国风设计体系</span>
          </li>
          <li>
            <span className="tl-when">打磨</span>
            <strong>铺满全国与体验打磨</strong>
            <span>
              知识库扩至 {ready ? num(stat.items) : '…'} 项覆盖{' '}
              {ready ? num(stat.provs) : '…'} 省级行政区、地图数据大屏、骨架屏与端到端回归
            </span>
          </li>
        </ul>
      </section>

      <section className="ab-card reveal" id="team">
        <h2>核心团队</h2>
        <p className="ab-section-sub">三人成军，覆盖算法智能、工程基建与内容质量的完整闭环</p>
        <div className="ab-team">
          <div>
            <span className="ab-role">项目负责人 · 首席架构师</span>
            <strong>周子昊</strong>
            <span>
              统筹产品方向与总体技术架构；主导多智能体编排、RAG 检索增强体系，
              以及国风视觉语言与全链路交互设计
            </span>
          </div>
          <div>
            <span className="ab-role">后端架构 · 数据工程负责人</span>
            <strong>马占赟</strong>
            <span>
              主持 FastAPI 服务架构与非遗数据工程管线，负责知识底座建设、
              云端部署运维与系统稳定性保障
            </span>
          </div>
          <div>
            <span className="ab-role">内容总监 · 质量与体验负责人</span>
            <strong>李思雨</strong>
            <span>
              主持知识库内容编校与权威来源核验，把关史实准确与信源可信；
              统筹用户体验测试与路演汇报体系
            </span>
          </div>
        </div>
      </section>

      <section className="ab-card reveal ab-advisor-card" id="advisor">
        <p className="ab-adv-kicker">EXPERT MENTORSHIP · 专家指导</p>
        <h2>指导教师</h2>
        <p className="ab-section-sub">资深教授领衔把关，人工智能专业青年骨干教师全程技术督导</p>
        <div className="ab-team ab-advisors">
          <div className="ab-adv-main">
            <span className="ab-adv-badge">教授</span>
            <strong>于静</strong>
            <span className="ab-adv-field">计算机科学与技术</span>
            <span className="ab-adv-duty">总体学术指导 · 选题方向与研究方法论把关</span>
          </div>
          <div>
            <span className="ab-adv-badge ab-adv-badge-alt">讲师</span>
            <strong>赵米傲</strong>
            <span className="ab-adv-field">人工智能</span>
            <span className="ab-adv-duty">智能体技术路线指导 · 工程实现全程督导</span>
          </div>
        </div>
      </section>

      <footer className="ab-footer">CHENGMAI · 让千年非遗被这一代人接住</footer>
    </div>
  )
}
