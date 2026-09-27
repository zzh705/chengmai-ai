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
    creations: list[dict]
    interests: list[dict]
