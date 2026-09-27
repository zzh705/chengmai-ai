"""POST /api/story/generate — 非遗故事生成器。"""

from fastapi import APIRouter, HTTPException

from app.agents.story_agent import generate_story
from app.schemas.story import StoryRequest, StoryResponse, StorySection

router = APIRouter(prefix="/api", tags=["story"])


@router.post("/story/generate", response_model=StoryResponse)
def story_generate(req: StoryRequest) -> StoryResponse:
    """故事生成：知识库检索 → 结构化故事输出。"""
    try:
        title, sections, tips, sources = generate_story(req)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=502, detail=f"故事生成解析失败: {e}")
    return StoryResponse(
        topic=req.topic, title=title, sections=sections, spread_tips=tips, sources=sources
    )
