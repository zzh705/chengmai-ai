# 承脉 AI — 中华非遗智能传承与活化智能体

> 让 AI 读懂非遗，让年轻人成为传承者。

**HeritagePulse AI** — 2026 华北五省（市、自治区）及港澳台大学生计算机应用大赛天津赛区 · 大模型与智能体应用赛道

## 团队

| 成员 | 角色 | 负责模块 |
|------|------|---------|
| 周子昊 | AI / Agent 总工程师 | Qwen3、RAG、Agent、知识图谱逻辑 |
| 周子昊 | 产品 / UIUX + 前端 | 页面、动画、交互、视觉体系 |
| 马占赟 | 后端 / 数据 / 部署 | FastAPI、PostgreSQL、Docker、公网部署 |

## 分支规范

- `main`：比赛正式版本，永远保持可演示
- `dev`：每日集成分支
- `dev-ai` / `dev-frontend` / `dev-backend`：个人开发分支

## 快速开始

```bash
# 后端
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# 前端
cd frontend && npm install && npm run dev
```

## 文档

- 总工程文档：`PROJECT_MASTER.md`
- 接口合同：`docs/api_contract.md`
