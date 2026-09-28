"""内存向量库：切块 → 向量化 → 余弦相似度检索（Phase 6 迁移 pgvector）。"""

import json
import os
from pathlib import Path

import numpy as np

from app.rag.embeddings import embed_texts

_CACHE_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent
    / "data"
    / "structured"
    / "embeddings_cache.json"
)

_chunks: list[dict] = []
_vectors: np.ndarray | None = None


def _make_chunks(items: list[dict]) -> list[dict]:
    """把每个非遗项目切块：简介 / 技艺 / 文化内涵 / 冷知识（RAG 检索单元）。"""
    chunks = []
    for item in items:
        for field, label in [
            ("description", "简介"),
            ("craft_process", "技艺"),
            ("cultural_meaning", "文化内涵"),
        ]:
            text = item.get(field, "")
            if text:
                chunks.append(
                    {
                        "item_id": item["id"],
                        "item_name": item["name"],
                        "label": label,
                        "text": text,
                    }
                )
        # 一分钟讲述 + 大事年表（叙事性检索块，"讲讲来龙去脉"类提问命中）
        story = item.get("story", "")
        if story:
            tl = item.get("timeline") or []
            if tl:
                years = "；".join(f"{t.get('year', '')}：{t.get('event', '')}" for t in tl)
                story = f"{story}\n大事年表：{years}"
            chunks.append(
                {
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "label": "一分钟认识",
                    "text": story,
                }
            )
        # 冷知识块：钩子 + fun_facts（让"有什么冷知识"类提问能命中）
        facts = item.get("fun_facts") or []
        if facts:
            hook = item.get("hook", "")
            text = "\n".join(f"· {x}" for x in facts)
            if hook:
                text = f"· {hook}\n{text}"
            chunks.append(
                {
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "label": "冷知识",
                    "text": text,
                }
            )
    return chunks


def ensure_index(items: list[dict]) -> None:
    """确保索引就绪：有缓存读缓存，没有则向量化并写缓存。"""
    global _chunks, _vectors
    if _vectors is not None:
        return

    model = os.getenv("EMBEDDING_MODEL", "text-embedding-v3")
    if _CACHE_PATH.exists():
        cache = json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
        if cache.get("model") == model and cache.get("items_count") == len(items):
            _chunks = cache["chunks"]
            _vectors = np.array(cache["vectors"], dtype=np.float32)
            return

    _chunks = _make_chunks(items)
    if not _chunks:
        _vectors = np.zeros((0, 0), dtype=np.float32)
        return
    _vectors = np.array(embed_texts([c["text"] for c in _chunks]), dtype=np.float32)
    _CACHE_PATH.write_text(
        json.dumps(
            {"model": model, "items_count": len(items), "chunks": _chunks, "vectors": _vectors.tolist()},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def search(query: str, items: list[dict], top_k: int = 6) -> list[dict]:
    """语义检索：返回按相似度排序的 chunk（含 item_id）。"""
    ensure_index(items)
    if _vectors is None or len(_chunks) == 0:
        return []

    q = np.array(embed_texts([query])[0], dtype=np.float32)
    sims = _vectors @ q / (np.linalg.norm(_vectors, axis=1) * np.linalg.norm(q) + 1e-9)
    order = np.argsort(sims)[::-1][:top_k]
    return [{**_chunks[i], "similarity": float(sims[i])} for i in order]
