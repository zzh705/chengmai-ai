"""GET /api/heritage — 非遗知识库浏览接口。"""

import os
import time

from fastapi import APIRouter, HTTPException, Query

from app.knowledge.search import _DATA_DIR, _load_items, sources_of
from app.schemas.heritage import HeritageDetail, HeritageSummary

router = APIRouter(prefix="/api", tags=["heritage"])

_IMG_DIR = _DATA_DIR.parent.parent / "frontend" / "public" / "images" / "heritage"
# 有图 id 集合缓存：扫描约 2.6k 文件仅毫秒级，60s 过期一次，
# 使批量补图过程中新生成的图片能自动"浮上"列表。
_img_cache: tuple[float, set[str]] = (0.0, set())


def _image_ids() -> set[str]:
    global _img_cache
    now = time.time()
    if now - _img_cache[0] > 60:
        try:
            ids = {f[:-4] for f in os.listdir(_IMG_DIR) if f.endswith(".jpg")}
        except FileNotFoundError:
            ids = set()
        _img_cache = (now, ids)
    return _img_cache[1]


@router.get("/heritage", response_model=list[HeritageSummary])
def list_heritage(
    tier: str = Query("all", pattern="^(all|deep|index)$"),
    limit: int = Query(0, ge=0, le=20000),
) -> list[HeritageSummary]:
    """知识库项目概览。tier=deep 仅深读档案（选择器用），默认全部。

    排序：有实拍/AI 配图且图与实物相符的项目保持名录原序在前；
    缺图或图与实物不符的项稳定沉底（两者皆不进首页推荐位等图片展示位）。
    """
    img_ids = _image_ids()
    rows = [
        item
        for item in _load_items()
        if tier == "all" or item.get("tier", "deep") == tier
    ]
    # sorted 为稳定排序：图相符(0)在前、无图/图不符(1)沉底；组内保持原序
    rows = sorted(
        rows,
        key=lambda it: it["id"] not in img_ids or bool(it.get("image_mismatch", False)),
    )
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
            # 图与实物不符的项 has_image 也置 False，前端 pictured 过滤自动排除
            has_image=(item["id"] in img_ids) and not bool(item.get("image_mismatch", False)),
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
