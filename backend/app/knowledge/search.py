"""非遗知识检索（V1 关键词/字面匹配版，Phase 2 升级为 Embedding 向量检索）。"""

import json
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "structured"

_RELIABILITY_SCORE = {"official": 0.95, "academic": 0.9, "reference": 0.8, "auxiliary": 0.6}


@lru_cache(maxsize=1)
def _load_items() -> list[dict]:
    return json.loads((_DATA_DIR / "heritage_items.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _load_sources() -> dict[str, dict]:
    sources = json.loads((_DATA_DIR / "sources.json").read_text(encoding="utf-8"))
    return {s["id"]: s for s in sources}


def _item_terms(item: dict) -> list[tuple[str, int]]:
    """抽取项目的检索词及权重：名称5、类别3、地域2。"""
    terms = [(item["name"], 5)]
    for part in item["category"].replace("，", "·").split("·"):
        if len(part.strip()) >= 2:
            terms.append((part.strip(), 3))
    for part in item["region"].replace("，", "、").split("、"):
        if len(part.strip()) >= 2:
            terms.append((part.strip(), 2))
    return terms


def _bigrams(text: str) -> set[str]:
    return {text[i : i + 2] for i in range(len(text) - 1)}


def search(query: str, top_k: int = 3) -> list[dict]:
    """按相关度返回匹配的非遗项目（含 score 字段）。"""
    results = []
    query_bigrams = _bigrams(query)
    for item in _load_items():
        score = sum(weight for term, weight in _item_terms(item) if term in query)
        if score == 0 and query_bigrams:
            overlap = len(query_bigrams & _bigrams(item["description"])) / len(query_bigrams)
            score = round(overlap * 4, 2)
        if score > 0:
            results.append({**item, "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def sources_of(item: dict) -> list[dict]:
    """返回项目关联的来源列表（证据链）。"""
    catalog = _load_sources()
    return [catalog[sid] for sid in item.get("source_ids", []) if sid in catalog]


def credibility_of(sources: list[dict]) -> float:
    """来源可信度：各来源 reliability 的平均分。"""
    if not sources:
        return 0.0
    scores = [_RELIABILITY_SCORE.get(s.get("reliability_level", ""), 0.5) for s in sources]
    return round(sum(scores) / len(scores), 2)
