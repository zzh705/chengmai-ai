"""会话存储：内存版多轮对话上下文（Phase 5 迁移到 PostgreSQL）。"""

import time
from collections import defaultdict

_TTL_SECONDS = 3600  # 1 小时无交互自动清理
_MAX_HISTORY = 12  # 最多携带最近 12 条消息调用 LLM，控制 Token 成本

_sessions: dict[str, list[dict]] = defaultdict(list)
_last_active: dict[str, float] = {}


def _cleanup() -> None:
    """清理超过 TTL 未活动的会话，防止内存无限增长。"""
    now = time.time()
    expired = [sid for sid, t in _last_active.items() if now - t > _TTL_SECONDS]
    for sid in expired:
        _sessions.pop(sid, None)
        _last_active.pop(sid, None)


def get_history(session_id: str) -> list[dict]:
    """返回该会话最近的历史消息（role/content 格式，可直接喂给 LLM）。"""
    _cleanup()
    return list(_sessions.get(session_id, []))[-_MAX_HISTORY:]


def append(session_id: str, role: str, content: str) -> None:
    """追加一条消息到会话历史。"""
    _cleanup()
    _sessions[session_id].append({"role": role, "content": content})
    _last_active[session_id] = time.time()
