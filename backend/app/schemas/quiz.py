"""非遗知识测验接口的数据模型（总文档 3.5）。"""

from pydantic import BaseModel, Field


class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="测验主题，如'苏绣'")
    count: int = Field(3, ge=1, le=10, description="题目数量")
    difficulty: str = Field("medium", description="难度 easy/medium/hard")


class QuizQuestion(BaseModel):
    id: int
    type: str = Field("choice", description="choice 选择题 / judge 判断题")
    question: str
    options: list[str]
    answer: str = Field(description="正确选项的完整文本")
    explanation: str = Field(description="答案解析（关联知识库依据）")


class QuizResponse(BaseModel):
    code: int = 0
    topic: str
    questions: list[QuizQuestion]
    sources: list[str] = Field(default_factory=list, description="参考的知识库条目")
