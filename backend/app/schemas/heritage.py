"""非遗知识库接口的数据模型。"""

from pydantic import BaseModel


class HeritageSummary(BaseModel):
    id: str
    name: str
    category: str
    region: str
    level: str
    image: str  # 前端图片路径（public/images/heritage/{id}.jpg）


class HeritageDetail(BaseModel):
    id: str
    name: str
    category: str
    region: str
    era: str
    level: str
    image: str
    description: str
    cultural_meaning: str
    craft_process: str
    representative_works: list[str]
    representative_inheritors: list[str]
    sources: list[dict]
