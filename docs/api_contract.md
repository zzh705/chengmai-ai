# 承脉 AI 接口合同 API Contract V1.0

> 本文件是三人协作的"法律文件"。
> 任何人要改接口字段，**必须先改这里**，再改代码，并在群里通知另外两人。

- 统一前缀：`/api`
- 数据格式：JSON（UTF-8）
- 字段命名：**snake_case**（如 `session_id`）
- 认证：V1 版本暂不登录，后续用 `X-User-Id` 请求头

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

## 接口清单（后续逐步补充）

| 状态 | 接口 | 用途 |
|------|------|------|
| ✅ 已定义 | POST /api/chat | AI 对话 |
| ⬜ 待定义 | POST /api/search | 非遗知识库搜索 |
| ⬜ 待定义 | GET /api/heritage/{id} | 非遗项目详情 |
| ⬜ 待定义 | GET /api/graph/{id} | 知识图谱关系 |
| ⬜ 待定义 | POST /api/learning-plan | 学习路径生成 |
| ⬜ 待定义 | POST /api/quiz/generate | 测验生成 |
| ⬜ 待定义 | POST /api/creation/generate | 活化实验室创作 |
