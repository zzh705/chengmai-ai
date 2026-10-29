# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：传承档案接口：浏览/计划/答题/创作四类事件聚合与称号、集印统计
# ============================================================
"""用户进度与传承档案接口（总文档 3.8）。"""

from fastapi import APIRouter

from app.schemas.user import ProgressAck, ProgressEvent, ProfileResponse
from app.services import progress_store

router = APIRouter(prefix="/api/user", tags=["user"])


@router.post("/progress", response_model=ProgressAck)
def post_progress(evt: ProgressEvent) -> ProgressAck:
    """记录一次传承行为（浏览/学习计划/测验/创作）。"""
    progress_store.record(
        evt.user_id, evt.event_type, evt.item_id, evt.item_name, evt.detail
    )
    return ProgressAck()


@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_profile(user_id: str) -> ProfileResponse:
    """获取个人非遗成长档案。"""
    return ProfileResponse(**progress_store.profile(user_id))
