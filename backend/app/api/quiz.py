"""POST /api/quiz/generate — 非遗知识测验。"""

from fastapi import APIRouter, HTTPException

from app.agents.quiz_agent import generate_quiz
from app.schemas.quiz import QuizRequest, QuizResponse

router = APIRouter(prefix="/api", tags=["quiz"])


@router.post("/quiz/generate", response_model=QuizResponse)
def quiz_generate(req: QuizRequest) -> QuizResponse:
    """测验生成：知识库检索 → 结构化题目输出。"""
    try:
        questions, sources = generate_quiz(req)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=502, detail=f"测验生成解析失败: {e}")
    return QuizResponse(topic=req.topic, questions=questions, sources=sources)
