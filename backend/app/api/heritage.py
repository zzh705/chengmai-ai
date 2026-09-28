"""GET /api/heritage — 非遗知识库浏览接口。"""

from fastapi import APIRouter, HTTPException, Query

from app.knowledge.search import _load_items, sources_of
from app.schemas.heritage import HeritageDetail, HeritageSummary

router = APIRouter(prefix="/api", tags=["heritage"])


@router.get("/heritage", response_model=list[HeritageSummary])
def list_heritage(
    tier: str = Query("all", pattern="^(all|deep|index)$"),
    limit: int = Query(0, ge=0, le=20000),
) -> list[HeritageSummary]:
    """知识库项目概览。tier=deep 仅深读档案（选择器用），默认全部。"""
    rows = [
        item
        for item in _load_items()
        if tier == "all" or item.get("tier", "deep") == tier
    ]
    if limit:
        rows = rows[:limit]
    return [
        HeritageSummary(
            id=item["id"],
            name=item["name"],
            category=item["category"],
            region=item["region"],
            level=item["level"],
            image=f"images/heritage/{item['id']}.jpg",
            hook=item.get("hook", ""),
            tier=item.get("tier", "deep"),
        )
        for item in rows
    ]


@router.get("/heritage/{item_id}", response_model=HeritageDetail)
def get_heritage(item_id: str) -> HeritageDetail:
    """单个项目完整详情。"""
    for item in _load_items():
        if item["id"] == item_id:
            return HeritageDetail(
                **item,
                image=f"images/heritage/{item['id']}.jpg",
                sources=sources_of(item),
            )
    raise HTTPException(status_code=404, detail=f"项目不存在: {item_id}")
