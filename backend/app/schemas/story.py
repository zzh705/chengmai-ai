# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：非遗故事接口自研 Pydantic 数据契约
# ============================================================
"""非遗故事生成接口的数据模型（总文档 3.6）。"""

from pydantic import BaseModel, Field


class StoryRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="非遗主题，如'京剧'")
    audience: str = Field("大学生", description="目标听众")
    minutes: int = Field(2, ge=1, le=10, description="故事时长（分钟）")
    mode: str = Field("youth", description="视角模式 scholar/inheritor/youth")


class StorySection(BaseModel):
    heading: str
    content: str


class StoryResponse(BaseModel):
    code: int = 0
    topic: str
    title: str
    sections: list[StorySection]
    spread_tips: list[str] = Field(default_factory=list, description="传播建议")
    sources: list[str] = Field(default_factory=list, description="参考的知识库条目")
