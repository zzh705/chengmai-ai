# 承脉 AI — 中华非遗智能传承与活化智能体

> 让 AI 读懂非遗，让年轻人成为传承者。

**承脉 AI（CHENGMAI）** — 2026 大学生计算机应用大赛 · 大模型与智能体应用赛道

## 在线体验

**公网地址：http://123.56.18.7**（阿里云 ECS · 北京，7×24 运行，浏览器直接访问，无需本地安装）

**网页版路演：http://123.56.18.7/deck/**（16 页，含新手指引实机录屏与动效）

线上版本与 `main` 分支保持一致；知识库、图谱、地图等数据功能开箱即用，AI 对话/学习/创作功能由服务端 DashScope Key 驱动。
演示账号「追光小队」已预置满级成长档案（1480 EXP / Lv.10 承脉大师、徽章与集印册全解锁）。

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

## 功能总览（11 个导航页 + 新手指引 + 题名入馆）

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
| 新手指引 | 十一站递进导览（灯线进度 + 字印站牌 + 断点续览），每站专属换景动画与非遗照片，登录 2 秒后邀请进入 |

全站已完成移动端适配：≤860px 折叠抽屉导航、新手指引一屏一站、键盘弹出时输入区不被遮挡，桌面端效果不受影响。

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

## 本地运行与测试

### 0. 环境要求

| 工具 | 版本 | 检查命令 |
|------|------|---------|
| Node.js | 20.19+ 或 22.12+（Vite 8 要求） | `node -v` |
| npm | 随 Node 安装 | `npm -v` |
| Python | 3.11 | `python3 --version` |
| Git | 任意近版 | `git --version` |

本地验收分两条路线：

- **只看界面（无需 Key）**：知识库、知识图谱、非遗地图、名家风采等纯数据页面全部可用；对话、学习路径、测验、创作需要模型。
- **完整验收**：在根目录 `.env` 填入 DashScope Key，并按第 5 步构建向量索引。

### 1. 获取代码

```bash
git clone https://github.com/zzh705/chengmai-ai.git
cd chengmai-ai
```

### 2. 配置环境变量

```bash
cp .env.example .env
# Windows PowerShell: copy .env.example .env
```

打开根目录 `.env`，至少填入 `LLM_API_KEY`（阿里云百炼 DashScope，`sk-` 开头），其余保持默认即可。
`.env` 位于项目根目录，后端启动时自动读取；该文件已被 gitignore，不会上传。修改后需重启后端。

### 3. 启动后端（终端 1）

推荐使用 uv（先安装：`pip install uv` 或 `brew install uv`；本机没有 Python 3.11 时 uv 会自动下载）：

```bash
cd backend
uv venv --python 3.11
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

已有 Python 3.11 也可用 pip：

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

看到 `Uvicorn running on http://127.0.0.1:8000` 即启动成功。另开终端验证：

```bash
curl http://127.0.0.1:8000/api/health
```

预期返回 `{"status":"ok","service":"chengmai-ai",...}`；接口文档在 http://127.0.0.1:8000/docs 。

数据说明：`data/structured/heritage_items.json`（3299 项）已随仓库提供；向量缓存 `embeddings_cache.npz` 约 70MB，未入库，首次 AI 对话会自动构建（需 Key，耗时数分钟），也可按第 5 步提前构建。

### 4. 启动前端（终端 2）

```bash
cd frontend
npm install        # 下载慢可临时换源：npm config set registry https://registry.npmmirror.com
npm run dev
```

浏览器打开 http://localhost:5173 。开发服务器已把 `/api` 代理到 `http://localhost:8000`，本地无需配置 `VITE_API_BASE`，也不会有跨域问题。

### 5. 构建向量索引（可选，配好 Key 后建议执行）

在项目根目录、后端虚拟环境已激活时执行：

```bash
source backend/.venv/bin/activate
python scripts/build_embeddings.py
```

生成 `data/structured/embeddings_cache.npz`。缓存带「模型名 + 条目数」双校验，数据或 Embedding 模型变化时会自动重建；也可删除该文件强制重建。

### 6. 本地验收清单

| 检查项 | 操作 | 预期结果 |
|--------|------|---------|
| 后端健康 | `curl /api/health` | 返回 `status: ok` |
| 接口文档 | 打开 http://127.0.0.1:8000/docs | 九组业务接口可见 |
| 首页 | 打开 http://localhost:5173 | 背景、导航、卡片正常 |
| 知识库 | 进入列表并搜索 | 3299 项，可搜索、可筛选 |
| 知识详情 | 点开任意一项 | 图文、工序、来源正常 |
| 知识图谱 | 进入族谱页 | 可缩放、可点节点、可搜索 |
| 非遗地图 | 进入地图页 | 中国地图按省着色，可点省份 |
| 名家风采 | 进入名家页 | 16 位名家档案与年表正常 |
| 新手指引 | 登录或游客入馆后等待约 2 秒 | 邀请卡出现，进入后十一站可翻页、可断点续览 |
| AI 对话 | 提问「苏绣有什么特点？」 | 逐字流式输出，附来源与证据分（需 Key） |
| 学习路径 | 自定义天数 1-30、每日 15-240 分钟 | 返回分阶段任务，可打卡 |
| 活化实验室 | 生成一份活化方案 | 四宫格内容完整，可存档 |
| 非遗挑战 | 答一题 | 正确率、徽章、错题本更新 |
| 个人中心 | 名号填「追光小队」注册后查看档案 | 自动预置满级：1480 EXP / Lv.10、6 枚传承徽章、8 枚集印 |
| 路演页 | 打开 http://localhost:5173/deck/ | 16 页网页版路演可翻页 |
| 移动端 | 浏览器设备模式选手机尺寸；或 `npm run dev -- --host` 后同 Wi-Fi 访问 `http://<本机局域网 IP>:5173` | 折叠菜单、单列排版正常，无横向滚动 |

### 7. 测试与构建

```bash
# 后端（在 backend 目录，虚拟环境已激活）
uv pip install -r requirements-dev.txt
python -m pytest tests/ -q

# 前端
cd ../frontend
npm run lint
npx tsc -b        # 与构建同源的类型检查
npm run build      # 产物在 frontend/dist
npm run preview    # 可选：本地预览构建结果
```

### 8. 常见问题

| 现象 | 处理 |
|------|------|
| 8000 或 5173 被占用 | `lsof -i :8000` 找到进程后结束；或改端口并同步修改 `frontend/vite.config.ts` 的代理目标 |
| 页面空白、接口 404 | 确认后端已在 8000 运行；看浏览器 Network；检查 Vite 代理是否指向 `http://localhost:8000` |
| AI 报 401 / 403 / 超时 | 检查 `.env` 中 Key 是否正确、百炼额度是否用尽、网络是否可达；改完重启后端 |
| Python 报联合类型语法错误 | 当前解释器低于 3.10，请改用 Python 3.11 创建虚拟环境 |
| `npm install` 失败 | 确认 Node 20.19+ 或 22.12+；网络慢可换 npmmirror 源 |
| `npm run build` 类型错误 | 按报错文件修类型，不要跳过 `tsc` |
| 首页视频、路演录屏缺失 | `frontend/public/videos/`、`frontend/public/deck/assets/` 的大体积媒体未入库，不影响其余功能；把文件放入对应目录即可 |
| 手机打不开 5173 | 用 `npm run dev -- --host` 启动，手机与电脑同一 Wi-Fi，并放行本机防火墙 |
| Windows 终端中文乱码 | 执行 `chcp 65001` 切换到 UTF-8 |

## 路演材料

- **网页版路演**：http://123.56.18.7/deck/，源码在 `frontend/public/deck/`（大体积录屏素材不入库，部署时单独放置 `assets/`）。
- 本地可编辑版：`frontend/承脉AI_路演演示.pptx`。
- `frontend/scripts/gen-pitch.mjs`：pptxgenjs 路演 PPT 生成脚本
  （`npm i -D pptxgenjs && node scripts/gen-pitch.mjs`，输出 16 页《承脉AI_路演演示.pptx》）。

## 服务器部署（已上线）

项目**已完成公网部署**：阿里云 ECS（北京，Ubuntu 22.04，2核2G）单机架构，
Nginx 80 端口同时托管前端静态资源与反代后端 API（SSE 流式已关缓冲），uvicorn 以 systemd 守护、开机自启。

- **线上地址**：http://123.56.18.7
- 首次初始化：服务器执行 `deployment/server-init.sh`（装环境 / 建 swap / 构建 / 起服务，幂等）
- 后续更新：服务器执行 `deployment/deploy.sh`（拉代码 → 构建 → 重启 → 自检，一条命令）
- 完整步骤、运维命令与排障见 [docs/DEPLOY.md](docs/DEPLOY.md)

## 分支规范

- `main`：比赛正式版本，永远保持可演示
- `dev`：每日集成分支
- `dev-ai` / `dev-frontend` / `dev-backend`：个人开发分支

## 文档

- 总工程文档：`PROJECT_MASTER.md`（立项规划 + V0.3 实现状态对账，2026-11-15）
- 产品事实口径：`PRODUCT.md`
- 接口合同：`docs/api_contract.md`（前后端唯一协作依据，改字段先改合同）
- 部署指南：`docs/DEPLOY.md`（阿里云 ECS 单机部署与运维手册）
- 从零搭建手册：`承脉AI-从零搭建指南.docx`
- 网站技术栈总结：`承脉AI-网站技术栈总结.docx`（依据 main 分支源码与线上部署实况整理）

## 数据与许可声明

- 知识库内容仅收录有权威出处的非遗信息（中国非物质文化遗产网、中国政府网、光明日报等），
  每条 AI 回答标注「来源 + 证据分」；宁缺毋滥，不编造。
- 配图来源于 Wikimedia Commons 开放许可实拍与程序生成纹样字卡，
  许可信息见 `frontend/public/images/heritage/credits.json`，关于页声明与管线一一对应。
- `backend/data/auth_secret.key`（HMAC 密钥，首次启动自动生成）与
  `backend/data/users.json`（用户库）已被 gitignore，不会进入仓库。
