# 承脉 AI — 中华非遗智能传承与活化智能体

> 让 AI 读懂非遗，让年轻人成为传承者。

**承脉 AI（CHENGMAI）** — 2026 大学生计算机应用大赛 · 大模型与智能体应用赛道

## 项目一句话

把国家级非遗名录全量结构化为 AI 可讲、可教、可玩、可传的知识资产，
用三视角对话、非遗族谱、地域地图、学习路径、活化实验室、答题挑战等十个以上入口，
把「了解非遗」转化为「理解 → 学习 → 参与 → 传播」的完整传承闭环。

## 团队

| 成员 | 角色 | 负责模块 |
|------|------|---------|
| 周子昊 | AI / Agent 总工程师 + 前端/UIUX | Qwen、RAG、多 Agent、知识族谱、页面与交互 |
| 马占赟 | 后端 / 数据 / 部署 | FastAPI、数据管线、接口联调、公网部署 |
| 李思雨 | 内容 / 质量 | 知识库内容编校与来源核验、用户体验测试、演示材料 |

## 功能总览（11 个导航页 + 题名入馆）

| 页面 | 说明 |
|------|------|
| 首页 | 今日非遗 / AI 推荐 / 地域探索 / 学习进度 / AI 提问入口 |
| 承脉 AI | 三视角对话（学者/传承人/青年传播者），支持 SSE 流式输出，回答附证据分与来源，可发起测验卡/故事卡/学习计划卡 |
| 非遗知识库 | 3299 项国家级名录全量结构化，3064 张配图（92.9%）逐张版权标注，搜索 + 详情 + 权威来源 |
| 知识图谱 | 「非遗族谱」371 节点 / 519 关系，d3.hierarchy 树状布局 SVG 渲染，三千星尘环带拟全量收录，缩放/搜索/详情/子图聚焦 |
| 非遗地图 | d3-geo 中国地图，按地域着色、点击省份查看当地项目 |
| 名家风采 | 16 位开宗立派的源头人物（梅兰芳、侯宝林、张明山等），公版影像 + 年表 + 艺林故事 |
| 学习路径 | 目标/天数/时长可选，任务勾选打卡与进度条（本地持久化） |
| 活化实验室 | 文化护栏 + 四宫格分步，方案类型/风格/受众可选，历史方案本地存档 |
| 非遗挑战 | 正确率环、传承徽章、分主题战绩、错题本 |
| 个人中心 | 浏览/计划/测验/创作四类埋点 + 兴趣画像 + 名号印章 |
| 关于项目 | 简介、多智能体架构、技术栈、图片许可声明、来源与分工 |
| 题名入馆 | 实名注册/登录（PBKDF2 口令哈希 + HMAC 令牌，30 天有效）或游客入馆（仅存名号） |

## 数据资产

- **3299 项**国家级非遗代表性项目：全部完成 AI 叙事化扩写（钩子 / 冷知识 / 数字亮点 / 时间线 / 工艺流程 / 文化内涵 / 代表作品）。
- **49 项**深读档案关联权威来源（中国非物质文化遗产网等），AI 回答据此输出「来源 + 证据分」。
- **3064 张**项目配图（覆盖率 92.9%）：Wikimedia Commons 实拍 + 程序生成纹样字卡，`credits.json` 逐张记录许可。
- **16 位**名家档案：仅录有可确证公版影像者，宁缺毋滥。
- 覆盖民间文学、传统音乐、舞蹈、戏剧、曲艺、体育游艺杂技、美术、技艺、医药、民俗十大门类。

## 技术栈

**前端**：React 19 · TypeScript · Vite · D3.js（hierarchy 族谱 / geo 地图） · 原生 SVG/CSS 动效

**后端**：FastAPI · Pydantic · SSE 流式 · GZip

**AI**：阿里云百炼 DashScope（qwen-plus 对话生成 · text-embedding-v3 向量化） · 意图识别 · 多 Agent（对话/学习/测验/故事/创作）

**检索与数据**：结构化 JSON 知识库 · numpy 内存向量库（余弦检索，npz 缓存） · 知识族谱关系网络 · 文件型会话/进度存储（V1）

## 快速开始

### 环境要求

- Python 3.11（uv 或 pip 管理）· Node.js 18+ · 已配置 DashScope API Key

### 后端

```bash
cd backend
uv venv --python 3.11 && source .venv/bin/activate
uv pip install -r requirements.txt
cp ../.env.example ../.env   # 填入 LLM_API_KEY（DashScope）
python -m uvicorn app.main:app --reload   # http://localhost:8000
```

向量库在首次对话时按知识库自动构建并缓存至 `data/structured/embeddings_cache.npz`；
内容扩充脚本：`python -m scripts.expand_deep_fields`（断点续传，按需运行）。

### 前端

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173（/api 已代理到 8000）
```

### 测试与构建

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/ -q
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

## 路演材料

- `frontend/scripts/gen-pitch.mjs`：pptxgenjs 路演 PPT 生成脚本
  （`npm i -D pptxgenjs && node scripts/gen-pitch.mjs`，输出 16 页《承脉AI_路演演示.pptx》）。

## 分支规范

- `main`：比赛正式版本，永远保持可演示
- `dev`：每日集成分支
- `dev-ai` / `dev-frontend` / `dev-backend`：个人开发分支

## 文档

- 总工程文档：`PROJECT_MASTER.md`（立项规划 + V0.2 实现状态对账）
- 产品事实口径：`PRODUCT.md`
- 接口合同：`docs/api_contract.md`（前后端唯一协作依据，改字段先改合同）

## 数据与许可声明

- 知识库内容仅收录有权威出处的非遗信息（中国非物质文化遗产网、中国政府网、光明日报等），
  每条 AI 回答标注「来源 + 证据分」；宁缺毋滥，不编造。
- 配图来源于 Wikimedia Commons 开放许可实拍与程序生成纹样字卡，
  许可信息见 `frontend/public/images/heritage/credits.json`，关于页声明与管线一一对应。
- `backend/data/auth_secret.key`（HMAC 密钥，首次启动自动生成）与
  `backend/data/users.json`（用户库）已被 gitignore，不会进入仓库。
