# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **首要：比赛评委**（第 11 届全国大学生市场调查与大赛，5 分钟演示 + 答辩场景）。演示的成败直接决定比赛成绩；界面打磨以评委动线与第一印象优先。
- **次要：年轻学习者 / 非遗爱好者**（产品定位口径中的 Z 世代用户），在真实使用中靠内容深度与检索效率留住。

## Product Purpose

「承脉 AI」是一个面向中华非物质文化遗产的垂直领域 AI 智能体，同时是十屏叙事型 Web 应用。它把国家级非遗名录全量结构化（3299 项），为比赛讲好「用 AI 讲好中国非遗故事」的故事。成功 = 演示打动评委 + 答辩时数据、工程、口径全部可验证。

## Positioning

- 全量：3299 项国家级名录结构化收录（vs 竞品零散条目）。
- 深度：49 项「苏绣级」深读档案（钩子 / 冷知识 / 数字亮点 / 时间线 / 代表作），索引层 3250 项升级为同规格为正在进行的既定目标。
- 机制：AI 回答依据知识库资料并带「来源 + 证据分」口径；检索、星图、地图、挑战、档案多模态入口互达。

## Operating Context

- **比赛节点**：部署方案为 P0，10/5 截止；比赛材料 11 项见 `PROJECT_MASTER.md`。
- **演示网络**：现场网络待定 —— 按「有稳定网、AI 实时调用 DashScope」准备，同时留意离线兜底方案（未决，不提前实现）。
- **团队**：3 人分工（成员 A：AI/Agent + 前端；成员 B：前端/UIUX；成员 C：数据/后端）。开发与答辩材料由成员 A 承担主要工程。
- **AI 依赖**：DashScope `qwen-plus`（对话/生成）+ `text-embedding-v3`（RAG），API Key 走 `.env`（gitignored）；配额耗尽时对话与出题不可用，需人工换 key/充值。
- **数据管线**：内容升级（`scripts/enrich_full.py`，断点续传）、配图（`scripts/fetch_images*.py`，Commons + 生成字卡三层）、向量库重建（`scripts/build_embeddings.py`）均为手动脚本，不在服务内自动跑。
- **本地开发**：FastAPI `uvicorn`（8000）+ Vite dev server（5173）；回归 = oxlint + tsc + build + pytest + `frontend/e2e.mjs`。

## Capabilities and Constraints

- 十页面 state 路由：首页 / 承脉 AI / 知识库 / 知识图谱 / 非遗地图 / 学习路径 / 活化实验室 / 非遗挑战 / 传承档案 / 关于项目。
- AI 对话三模式（学者 / 传承者 / 少年）；Chat 深度模式与页面模式配色联动。
- 知识图谱为 Canvas 星空星座图（大类=星座、省份=星团、深读=亮星），缩放/搜索/详情/关系跳转。
- **约束**：中文单语（不做 i18n）；内容口径宁缺毋滥、不编造（enrich system prompt 已固化）；配图必须 100% 覆盖且 About 页许可声明保持真实（Commons 实拍 + 程序生成纹样字卡两层如实标注）；RAG 向量库须全量 3299 条重建（已确认）。
- **未决**：部署平台未选型（本批次打磨完成后启动）。

## Brand Commitments

- 名称：**承脉 AI**（logo 为「承脉」朱红印章）；slogan 现有口径见首页/关于页。
- 视觉基调（用户口述为 binding）：**自然、高级感、中国味、不花里胡哨**；暗墨底 + 描金 + 朱红的 vintage/heritage 调性；动效服务叙事、不炫技。
- 既有术语口径：深读档案 / 索引层（名录在册）/ 非遗星图 / 十大类。
- About 页对数据、图片许可、来源的声明必须与实际管线一一对应，改管线必须同步改声明。

## Evidence on Hand

- `data/structured/heritage_items.json`：3299 项（49 深读全量字段；索引层升级断点 `index_enrich.json` 进行中）。
- `frontend/public/images/heritage/`：深读 49/49 有实拍图，`credits.json` 逐张记录许可；索引层配图三层管线进行中。
- `PROJECT_MASTER.md`：11 项比赛材料清单与进度。
- 回归资产：`frontend/e2e.mjs` 全流程断言 + `/tmp/shots` 截图（临时，非仓库资产）。
- **缺失（不得虚构）**：无真实用户测试数据、无线上部署地址、无比赛材料成稿、无登录/用户体系。

## Product Principles

1. 宁缺毋滥：不确定的内容不写、不确定的图不用，空缺用如实标注的兜底补位。
2. 评委演示优先：动线与第一印象的取舍优先于边角功能。
3. 一切声明可验证：数据、许可、来源都能指到具体文件或官方名录。
4. 克制的中国味：审美服务于内容与叙事，不做与非遗无关的装饰性炫技。
5. 改必回归：任何批次收尾前必须过 lint / tsc / build / e2e。
