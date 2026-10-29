# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：活化实验室接口：文化护栏约束下的结构化活化方案生成与失败兜底
# ============================================================
"""POST /api/creation/generate — 非遗活化实验室。"""

from fastapi import APIRouter

from app.agents.creation_agent import generate_creation
from app.schemas.creation import CreationRequest, CreationResponse

router = APIRouter(prefix="/api", tags=["creation"])


@router.post("/creation/generate", response_model=CreationResponse)
def creation_generate(req: CreationRequest) -> CreationResponse:
    """活化方案生成：知识库检索 → 文化语义分析 → 结构化创意输出。"""
    result, sources = generate_creation(req)
    return CreationResponse(heritage=req.heritage, result=result, sources=sources)
