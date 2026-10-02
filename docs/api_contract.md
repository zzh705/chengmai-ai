# 承脉 AI 接口合同 API Contract V1.1

> 本文件是三人协作的"法律文件"。
> 任何人要改接口字段，**必须先改这里**，再改代码，并在群里通知另外两人。

- 统一前缀：`/api`
- 数据格式：JSON（UTF-8）；流式为 `text/event-stream`（SSE）
- 字段命名：**snake_case**（如 `session_id`）
- 认证（V1.1 更新）：题名入馆双轨制 ——
  实名用户经 `/api/register`、`/api/login` 取得 HMAC 令牌（30 天有效）；
  游客免登录，进度类接口以前端生成的匿名 `user_id` 承载。
  令牌当前存于前端 localStorage，作为身份标识；V1 业务接口不强制校验令牌。
- 版本记录：V1.0（2026-09-28）初版；V1.1（2026-10-02）补认证与流式接口、更新数据口径。

---

## 1. POST /api/chat — 承脉 AI 对话（P0 核心接口）

**调用链**：成员 B(React) → 成员 C(FastAPI) → 成员 A(Agent/RAG/Qwen3) → 返回

### 请求

```json
{
  "message": "给我介绍一下苏绣",
  "mode": "youth",
  "session_id": "abc123",
  "user_id": "u_001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户输入的问题 |
| mode | string | 否 | 视角模式：`scholar` 学者 / `inheritor` 传承人 / `youth` 青年传播者，默认 `youth` |
| session_id | string | 否 | 会话 ID，用于多轮对话；首次传 null，由后端返回新 ID |
| user_id | string | 否 | 用户标识，用于传承档案 |

### 返回（成功 200）

```json
{
  "code": 0,
  "session_id": "abc123",
  "answer": "苏绣是中国传统刺绣的重要代表之一……",
  "sources": [
    {
      "id": "src_001",
      "title": "中国非物质文化遗产网 · 苏绣",
      "publisher": "中国非物质文化遗产网",
      "url": "https://www.ihchina.cn/",
      "publish_time": "2006-05-20",
      "reliability_level": "official"
    }
  ],
  "related_items": [
    { "id": "h_suxiu", "name": "苏绣", "type": "heritage" },
    { "id": "r_jiangsu", "name": "江苏苏州", "type": "region" }
  ],
  "actions": [
    { "type": "learning_plan", "label": "生成 5 分钟入门路线" },
    { "type": "quiz", "label": "生成 3 道测试题" },
    { "type": "graph", "label": "查看知识关系" }
  ],
  "evidence_score": {
    "relevance": 0.92,
    "credibility": 0.95,
    "coverage": 0.89,
    "total": 0.92
  },
  "intent": "INFO"
}
```

| 返回字段 | 负责提供方 | 说明 |
|---------|-----------|------|
| answer | 成员 A | AI 生成的回答 |
| sources | 成员 A → C 透传 | **证据链**，必填，可为空数组但字段必须存在 |
| related_items | 成员 A | 关联非遗/地域，供 B 做"查看知识关系"跳转 |
| actions | 成员 A | 推荐下一步操作（学习路径/测验/图谱） |
| evidence_score | 成员 A | 证据分（内部工程指标，B 可展示为"依据强度"） |
| intent | 成员 A | 识别出的意图：INFO/LEARNING/COMPARE/STORY/CREATION/QUIZ/TRAVEL/SOURCE |

### 失败返回

```json
{ "code": 1, "message": "错误描述" }
```

---

## 2. 规则

1. **`sources` 字段永远不能省略**——没有来源时返回 `[]`，B 端据此显示"暂未找到权威资料"。
2. 成员 B 在后端完成前，用 `mock/api_chat.json` 模拟返回，字段必须与本合同一致。
3. 新增字段：向后兼容（可以加，不能随意删）。
4. 修改字段：先改本文件 → 群里通知 → 再改代码。

---

## 接口清单（2026-10-02 更新）

| 状态 | 接口 | 用途 |
|------|------|------|
| ✅ 已实现 | POST /api/register | 实名注册（名号 + 口令，PBKDF2 哈希，返回 HMAC 令牌） |
| ✅ 已实现 | POST /api/login | 实名登录，返回令牌 |
| ✅ 已实现 | POST /api/chat | AI 对话（含意图/来源/证据分/动作） |
| ✅ 已实现 | POST /api/chat/stream | AI 对话 SSE 流式版（meta → delta* → done） |
| ✅ 已实现 | GET /api/heritage | 知识库列表（3299 项全量） |
| ✅ 已实现 | GET /api/heritage/{id} | 非遗项目详情（含 `image`、`sources`、叙事化字段） |
| ✅ 已实现 | GET /api/graph · /api/graph/{id} | 非遗族谱全图（371 节点/519 关系）/ 一跳子图 |
| ✅ 已实现 | POST /api/learning-plan | 学习路径生成 |
| ✅ 已实现 | POST /api/quiz/generate | 测验生成 |
| ✅ 已实现 | POST /api/story/generate | 故事生成 |
| ✅ 已实现 | POST /api/creation/generate | 活化实验室创作 |
| ✅ 已实现 | POST /api/user/progress | 记录进度事件 |
| ✅ 已实现 | GET /api/user/profile/{uid} | 个人传承档案 |
| ✅ 已实现 | GET /api/health | 健康检查 |

### POST /api/register · POST /api/login（V1.1 新增）

请求：

```json
{ "name": "周子昊", "password": "abc123456" }
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `name` | string | 1-12 字符 | 名号；「游客」为保留名号；注册时 409 表示已被占用 |
| `password` | string | 6-64 字符 | PBKDF2-HMAC-SHA256 + 每用户随机盐存储，不落明文 |

返回（200）：

```json
{ "name": "周子昊", "token": "base64payload.32位hmac签名" }
```

令牌载荷为 `{name, exp}`（30 天有效），签名密钥存服务端
`backend/data/auth_secret.key`（首次启动自动生成，已 gitignore）。

### POST /api/chat/stream（V1.1 新增，SSE）

请求体与 `/api/chat` 完全一致。响应为 `text/event-stream`，事件顺序：

1. `meta`：LLM 出字前先到，前端立即渲染证据链
   `{type:"meta", session_id, sources, related_items, actions, evidence_score, intent}`
2. `delta`：答案增量，可多次
   `{type:"delta", text:"苏绣"}`
3. `done`：`{type:"done"}`

半途失败时已生成部分仍写入会话，保证多轮上下文不断裂。

### POST /api/learning-plan（V2，2026-09-28 扩展）

请求：

```json
{
  "topic": "苏绣",
  "days": 7,
  "level": "beginner",
  "goal": "understand",
  "daily_minutes": 60
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `goal` | string | `understand` 入门了解 / `master` 深入掌握 / `teach` 讲给别人听 |
| `daily_minutes` | int | 15-240，决定每日任务量（≤30→1-2 个，≤60→2-3 个，其余 3-4 个） |

返回：`{code, topic, days:[{day,title,tasks}], sources}`（不变）。

### POST /api/creation/generate（V2，2026-09-28 扩展）

请求：

```json
{
  "heritage": "剪纸",
  "requirement": "校园社团一周活动",
  "output_type": "plan",
  "style": "guochao",
  "audience": "campus"
}
```

| 字段 | 取值 |
|------|------|
| `output_type` | `plan` 文创 / `event` 活动 / `video` 短视频 / `exhibit` 展览（新增） |
| `style` | `guochao` 国潮融合 / `serious` 学术严谨 / `lively` 活泼轻趣（新增） |
| `audience` | `campus` 校园 / `community` 社区 / `overseas` 海外中文学习者（新增） |

### GET /api/heritage（V2，2026-09-28 扩展）

列表与详情均新增 `image` 字段（如 `images/heritage/h_suxiu.jpg`，
指向 `frontend/public/images/heritage/`，404 时前端回退渐变字卡）；
图片版权标注见同目录 `credits.json`。
