"""文本向量化：调用 DashScope text-embedding-v3（OpenAI 兼容协议）。"""

import os

from openai import OpenAI

_client: OpenAI | None = None

DEFAULT_EMBEDDING_MODEL = "text-embedding-v3"


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
            api_key=os.getenv("LLM_API_KEY"),
        )
    return _client


def embed_texts(texts: list[str]) -> list[list[float]]:
    """把文本列表转成向量列表（DashScope 单批上限 10 条，自动分批请求）。"""
    vectors: list[list[float]] = []
    for i in range(0, len(texts), 10):
        resp = _get_client().embeddings.create(
            model=os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL),
            input=texts[i : i + 10],
        )
        vectors.extend(d.embedding for d in resp.data)
    return vectors
