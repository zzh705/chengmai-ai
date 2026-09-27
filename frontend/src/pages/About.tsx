import '../styles/about.css'

export default function About() {
  return (
    <div className="ab-page">
      <header className="ab-header">
        <div className="ab-seal">承脉</div>
        <h1>关于承脉 AI</h1>
        <p>面向文化理解与传播的非遗多智能体系统</p>
      </header>

      <section className="ab-card">
        <h3>🎯 项目简介</h3>
        <p>
          承脉 AI
          面向青少年与海外中文学习者，围绕国家级非物质文化遗产提供"检索问答、知识图谱、非遗地图、学习路径、活化创作、
          知识挑战"六位一体的服务。系统以可溯源的结构化知识库为底座（24 项国家级非遗、180
          节点关系图谱），以多智能体协作为核心，让每一次回答都带来源，让每一份创作都有依据，
          让学习进度可记录、可展示。
        </p>
      </section>

      <section className="ab-card">
        <h3>🤖 多智能体架构</h3>
        <div className="ab-agents">
          {[
            { n: '意图识别', d: '判断闲聊/检索/任务，分发给下游智能体' },
            { n: '检索问答', d: '关键词+语义混合检索，附证据分与来源' },
            { n: '学习规划', d: '按主题与天数生成可执行的学习路线' },
            { n: '活化创作', d: '文化护栏下的创意方案生成（四宫格+步骤）' },
            { n: '故事生成', d: '面向不同受众改写非遗故事' },
            { n: '测验出题', d: '依据知识库出题并判分解析' },
          ].map((a) => (
            <div key={a.n} className="ab-agent">
              <strong>{a.n}</strong>
              <span>{a.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-card">
        <h3>📦 技术栈</h3>
        <div className="ab-tags">
          {[
            'Python 3.11',
            'FastAPI',
            'Qwen3 大模型',
            'text-embedding-v3 语义检索',
            'D3.js 知识图谱 + d3-geo 非遗地图',
            'React 19 + TypeScript + Vite',
            '混合检索（关键词 + 向量）',
            '证据分与来源溯源',
            '用户进度与传承档案',
          ].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section className="ab-card">
        <h3>📚 数据与来源</h3>
        <p>
          知识库收录 24 项国家级非遗代表性项目（覆盖 15 个省级行政区），结构化字段（简介、文化内涵、技艺工序、
          代表作品、代表性传承人）逐条标注来源（中国非物质文化遗产网、UNESCO、中国民俗学网等），
          并配有来自 Wikimedia Commons 的自由许可图片；回答中以「来源」与「证据分」双重呈现可信度。
          数据仅用于教学演示，正式发布前将按赛制要求做权威信源核验。
        </p>
      </section>

      <section className="ab-card">
        <h3>👥 团队分工</h3>
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
