"""非遗知识库接口的数据模型。"""

from pydantic import BaseModel


class HeritageSummary(BaseModel):
    id: str
    name: str
    category: str
    region: str
    level: str


class HeritageDetail(BaseModel):
    id: str
    name: str
    category: str
    region: str
    era: str
    level: str
    description: str
    cultural_meaning: str
    craft_process: str
    representative_works: list[str]
    representative_inheritors: list[str]
    sources: list[dict]
