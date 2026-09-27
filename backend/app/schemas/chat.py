"""对话接口的数据模型（与 docs/api_contract.md 严格一致）。"""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """POST /api/chat 的请求体。"""

    message: str = Field(..., min_length=1, description="用户输入的问题")
    mode: str = Field("youth", description="视角模式: scholar/inheritor/youth")
    session_id: str | None = Field(None, description="会话 ID，首次传 null")
    user_id: str | None = Field(None, description="用户标识，用于传承档案")


class Source(BaseModel):
    """证据链来源（总文档 2.2 证据链回答）。"""

    id: str
    title: str
    publisher: str = ""
    url: str = ""
    publish_time: str = ""
    reliability_level: str = "unknown"


class RelatedItem(BaseModel):
    """关联实体，供前端跳转知识图谱。"""

    id: str
    name: str
    type: str


class Action(BaseModel):
    """推荐下一步操作按钮。"""

    type: str
    label: str


class EvidenceScore(BaseModel):
    """证据分（总文档 10.3，内部工程指标）。"""

    relevance: float = 0.0
    credibility: float = 0.0
    coverage: float = 0.0
    total: float = 0.0


class ChatResponse(BaseModel):
    """POST /api/chat 的返回体。"""

    code: int = 0
    session_id: str
    answer: str
    sources: list[Source]
    related_items: list[RelatedItem]
    actions: list[Action]
    evidence_score: EvidenceScore
    intent: str
