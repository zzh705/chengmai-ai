"""构建向量索引：python scripts/build_embeddings.py"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from app.knowledge.search import _load_items  # noqa: E402
from app.rag import vector_store  # noqa: E402


def main() -> None:
    items = _load_items()
    print(f"读取到 {len(items)} 个非遗项目，开始向量化…")
    vector_store.ensure_index(items)
    print(f"完成，共 {len(vector_store._chunks)} 个文本块")
    print(f"缓存文件：{vector_store._CACHE_PATH}")


if __name__ == "__main__":
    main()
