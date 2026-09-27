# 承脉 AI — 中华非遗智能传承与活化智能体

> 让 AI 读懂非遗，让年轻人成为传承者。

**承脉 AI（CHENGMAI）** — 2026 大学生计算机应用大赛 · 大模型与智能体应用赛道

## 团队

| 成员 | 角色 | 负责模块 |
|------|------|---------|
| 周子昊 | AI / Agent 总工程师 + 前端/UIUX | Qwen3、RAG、Agent、知识图谱、页面与交互 |
| 马占赟 | 后端 / 数据 / 部署 | FastAPI、PostgreSQL、Docker、公网部署 |
| 李思雨 | 内容 / 质量 | 知识库内容编校与来源核验、用户体验测试、演示材料 |

## 功能总览（10 个页面）

| 页面 | 说明 |
|------|------|
| 首页 | 今日非遗 / AI 推荐 / 地域探索 / 学习进度 / AI 提问入口 |
| 承脉 AI | 三视角对话（学者/传承人/青年传播者）、证据分与来源、测验卡/故事卡/学习计划卡 |
| 非遗知识库 | 24 项国家级非遗（15 省覆盖）、配图与版权标注、搜索、详情含来源 |
| 知识图谱 | D3 力导向图（180 节点 / 240 关系），缩放平移、点击详情、子图聚焦 |
| 非遗地图 | d3-geo 中国地图，按地域着色、点击省份看当地项目 |
| 学习路径 | 目标/天数/时长可选，任务勾选打卡与进度条（本地持久化） |
| 活化实验室 | 文化护栏 + 四宫格 + 步骤，方案类型/风格/受众可选，历史方案本地存档 |
| 非遗挑战 | 正确率环、传承徽章、分主题战绩 |
| 传承档案 | 浏览/计划/测验/创作四类埋点 + 兴趣画像 |
| 关于项目 | 简介、多智能体架构、技术栈、来源、分工 |

## 快速开始

### 环境要求

- Python 3.11（uv 管理）· Node.js 18+ · 已配置 DashScope API Key

### 后端

```bash
cd backend
uv venv --python 3.11 && source .venv/bin/activate
uv pip install -r requirements.txt
cp ../.env.example ../.env   # 填入 DASHSCOPE_API_KEY
# （可选，首次）构建语义检索向量：
python -m scripts.build_embeddings
python -m uvicorn app.main:app --reload   # http://localhost:8000
```

### 前端

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173（/api 已代理到 8000）
```

### 测试

```bash
cd backend && source .venv/bin/activate && python -m pytest tests/ -q
cd frontend && npm run lint && npm run build
```

## 分支规范

- `main`：比赛正式版本，永远保持可演示
- `dev`：每日集成分支
- `dev-ai` / `dev-frontend` / `dev-backend`：个人开发分支

## 文档

- 总工程文档：`PROJECT_MASTER.md`
- 接口合同：`docs/api_contract.md`（前后端唯一协作依据）

## 数据来源

知识库仅收录有权威出处的非遗信息（中国非物质文化遗产网、中国政府网、光明日报等），
每条回答标注「来源 + 证据分」，正式发布前按赛制要求完成权威信源核验。
