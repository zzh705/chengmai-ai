"""非遗知识检索（混合版：Embedding 语义检索为主，关键词匹配兜底）。"""

import json
from functools import lru_cache
from pathlib import Path

from app.rag import vector_store

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


def _keyword_search(query: str) -> dict[str, float]:
    """关键词/字面匹配打分，返回 {item_id: score}。"""
    scores: dict[str, float] = {}
    query_bigrams = _bigrams(query)
    for item in _load_items():
        score = sum(weight for term, weight in _item_terms(item) if term in query)
        if score == 0 and query_bigrams:
            overlap = len(query_bigrams & _bigrams(item["description"])) / len(query_bigrams)
            score = round(overlap * 4, 2)
        if score > 0:
            scores[item["id"]] = score
    return scores


def _vector_search(query: str) -> dict[str, float]:
    """语义检索打分，返回 {item_id: score}；失败时静默降级为空。"""
    try:
        hits = vector_store.search(query, _load_items())
    except Exception:
        return {}
    scores: dict[str, float] = {}
    for h in hits:
        points = round(h["similarity"] * 10, 2)
        item_id = h["item_id"]
        scores[item_id] = max(scores.get(item_id, 0.0), points)
    return scores


def search(query: str, top_k: int = 3) -> list[dict]:
    """混合检索：两路分数各取最大值后排序（两个量纲都换算到 0~10）。"""
    kw, vec = _keyword_search(query), _vector_search(query)
    merged = {
        item_id: max(kw.get(item_id, 0.0), vec.get(item_id, 0.0))
        for item_id in set(kw) | set(vec)
    }
    ranked = sorted(merged.items(), key=lambda x: x[1], reverse=True)[:top_k]
    items_by_id = {it["id"]: it for it in _load_items()}
    return [{**items_by_id[i], "score": s} for i, s in ranked if i in items_by_id and s > 0]


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
