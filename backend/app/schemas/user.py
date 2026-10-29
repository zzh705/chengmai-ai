# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：用户与传承档案接口自研 Pydantic 数据契约
# ============================================================
"""用户传承档案接口的数据模型。"""

from pydantic import BaseModel, Field


class ProgressEvent(BaseModel):
    user_id: str = Field(..., min_length=1)
    event_type: str = Field(..., description="view/learning_plan/quiz_answer/creation")
    item_id: str | None = None
    item_name: str | None = None
    detail: dict | None = None


class ProgressAck(BaseModel):
    code: int = 0


class ProfileResponse(BaseModel):
    code: int = 0
    user_id: str
    stats: dict
    viewed: list[dict]
    learning_plans: list[dict]
    quiz: dict
    quiz_by_topic: list[dict]
    creations: list[dict]
    interests: list[dict]
    activity: list[dict] = []
    recent_events: list[dict] = []
