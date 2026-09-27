"""知识图谱接口的数据模型。"""

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    extra: dict[str, str] | None = None


class GraphLink(BaseModel):
    source: str
    target: str
    relation: str


class GraphResponse(BaseModel):
    code: int = 0
    nodes: list[GraphNode]
    links: list[GraphLink]
