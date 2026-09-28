"""非遗知识库接口的数据模型。"""

from pydantic import BaseModel


class HeritageSummary(BaseModel):
    id: str
    name: str
    category: str
    region: str
    level: str
    image: str  # 前端图片路径（public/images/heritage/{id}.jpg）
    hook: str = ""  # 一句话悬念钩子（卡片展示）
    tier: str = "deep"  # deep=深读档案 / index=全国名录索引


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
    # 新颖介绍三件套（老数据缺失时用默认值兜底）
    hook: str = ""
    fun_facts: list[str] = []
    wow_numbers: list[dict] = []
    # 沉浸阅读：一分钟讲述 + 大事年表
    story: str = ""
    timeline: list[dict] = []
