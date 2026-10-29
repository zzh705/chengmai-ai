# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：学习路径接口：知识检索衔接规划 Agent 的请求编排层
# ============================================================
"""POST /api/learning-plan — 学习路径生成。"""

from fastapi import APIRouter

from app.agents.learning_agent import generate_plan
from app.knowledge.search import search as knowledge_search
from app.schemas.learning import LearningPlanRequest, LearningPlanResponse

router = APIRouter(prefix="/api", tags=["learning"])


@router.post("/learning-plan", response_model=LearningPlanResponse)
def learning_plan(req: LearningPlanRequest) -> LearningPlanResponse:
    """生成学习路径：知识库检索 → LLM 规划（失败有兜底）→ 结构化返回。"""
    items = knowledge_search(req.topic, top_k=2)
    days = generate_plan(req, items)
    sources = [it["name"] for it in items]
    return LearningPlanResponse(topic=req.topic, days=days, sources=sources)
