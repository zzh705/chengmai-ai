"""POST /api/learning-plan — 学习路径生成。"""

from fastapi import APIRouter

from app.agents.learning_agent import generate_plan
from app.knowledge.search import search as knowledge_search
from app.schemas.learning import LearningPlanRequest, LearningPlanResponse

router = APIRouter(prefix="/api", tags=["learning"])


@router.post("/learning-plan", response_model=LearningPlanResponse)
def learning_plan(req: LearningPlanRequest) -> LearningPlanResponse:
    """生成学习路径：知识库检索 → LLM 规划 → 结构化返回。"""
    days = generate_plan(req)
    sources = [it["name"] for it in knowledge_search(req.topic, top_k=2)]
    return LearningPlanResponse(topic=req.topic, days=days, sources=sources)
