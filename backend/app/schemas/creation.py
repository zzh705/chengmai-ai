"""非遗活化实验室接口的数据模型（总文档 2.5 / 3.7）。"""

from pydantic import BaseModel, Field


class CreationRequest(BaseModel):
    heritage: str = Field(..., min_length=1, description="非遗项目名，如'剪纸'")
    requirement: str = Field(..., min_length=1, description="用户的创意需求描述")
    output_type: str = Field("plan", description="方案类型: plan文创/ event活动/ video短视频")


class CreationResult(BaseModel):
    title: str = Field(description="创意主题")
    traditional_elements: list[str] = Field(default_factory=list, description="用到的传统元素")
    modern_carrier: list[str] = Field(default_factory=list, description="现代载体")
    spread_channels: list[str] = Field(default_factory=list, description="传播方式")
    ai_parts: list[str] = Field(default_factory=list, description="AI 可辅助部分")
    steps: list[str] = Field(default_factory=list, description="可实施步骤")
    guardrails: list[str] = Field(default_factory=list, description="不能随意改变的文化语义")


class CreationResponse(BaseModel):
    code: int = 0
    heritage: str
    result: CreationResult
    sources: list[str] = Field(default_factory=list, description="检索参考的知识库条目")
