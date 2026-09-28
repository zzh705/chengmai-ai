"""GET /api/heritage — 非遗知识库浏览接口。"""

from fastapi import APIRouter, HTTPException

from app.knowledge.search import _load_items, sources_of
from app.schemas.heritage import HeritageDetail, HeritageSummary

router = APIRouter(prefix="/api", tags=["heritage"])


@router.get("/heritage", response_model=list[HeritageSummary])
def list_heritage() -> list[HeritageSummary]:
    """知识库全部项目概览（列表页/下拉选择用）。"""
    return [
        HeritageSummary(
            id=item["id"],
            name=item["name"],
            category=item["category"],
            region=item["region"],
            level=item["level"],
            image=f"images/heritage/{item['id']}.jpg",
            hook=item.get("hook", ""),
        )
        for item in _load_items()
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
