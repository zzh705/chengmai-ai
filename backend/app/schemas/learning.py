"""学习路径接口的数据模型。"""

from pydantic import BaseModel, Field


class LearningPlanRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="学习主题，如'苏绣'")
    days: int = Field(7, ge=1, le=30, description="学习天数")
    level: str = Field("beginner", description="起点水平: beginner/intermediate")
    goal: str = Field("understand", description="学习目标: understand入门了解/master深入掌握/teach能讲给别人听")
    daily_minutes: int = Field(60, ge=15, le=240, description="每天可投入的分钟数")


class LearningDay(BaseModel):
    day: int
    title: str
    tasks: list[str]


class LearningPlanResponse(BaseModel):
    code: int = 0
    topic: str
    days: list[LearningDay]
    sources: list[str] = Field(default_factory=list, description="生成时参考的知识库条目")
