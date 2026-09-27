"""用户传承档案：进度事件记录与聚合（内存版，Phase 5 迁移到 PostgreSQL）。"""

import time
from collections import defaultdict

from app.knowledge.search import _load_items

_events: dict[str, list[dict]] = defaultdict(list)

_CATEGORY_BY_ID = None  # 延迟加载


def _category_of(item_id: str | None) -> str:
    global _CATEGORY_BY_ID
    if _CATEGORY_BY_ID is None:
        _CATEGORY_BY_ID = {it["id"]: it["category"] for it in _load_items()}
    return _CATEGORY_BY_ID.get(item_id or "", "其他")


def record(user_id: str, event_type: str, item_id: str | None = None,
           item_name: str | None = None, detail: dict | None = None) -> None:
    """记录一次传承行为事件。"""
    _events[user_id].append(
        {
            "event_type": event_type,
            "item_id": item_id,
            "item_name": item_name,
            "detail": detail or {},
            "ts": time.strftime("%Y-%m-%d %H:%M"),
        }
    )


def profile(user_id: str) -> dict:
    """聚合生成个人非遗成长档案。"""
    events = _events.get(user_id, [])

    viewed: dict[str, dict] = {}
    plan_topics: list[dict] = []
    creations: list[dict] = []
    quiz = {"answered": 0, "correct": 0}
    quiz_by_topic: dict[str, dict] = {}
    category_counts: dict[str, int] = defaultdict(int)

    for e in events:
        et = e["event_type"]
        if et == "view" and e["item_id"]:
            v = viewed.setdefault(e["item_id"], {"item_id": e["item_id"], "name": e["item_name"], "count": 0})
            v["count"] += 1
            category_counts[_category_of(e["item_id"])] += 1
        elif et == "learning_plan":
            plan_topics.append({"topic": e["item_name"], "ts": e["ts"]})
        elif et == "creation":
            creations.append({"topic": e["item_name"], "ts": e["ts"]})
        elif et == "quiz_answer":
            quiz["answered"] += 1
            if e["detail"].get("correct"):
                quiz["correct"] += 1
            topic = e["item_name"] or "综合"
            t = quiz_by_topic.setdefault(topic, {"topic": topic, "answered": 0, "correct": 0})
            t["answered"] += 1
            if e["detail"].get("correct"):
                t["correct"] += 1

    quiz["accuracy"] = round(quiz["correct"] / quiz["answered"], 2) if quiz["answered"] else 0.0
    for t in quiz_by_topic.values():
        t["accuracy"] = round(t["correct"] / t["answered"], 2)
    interests = sorted(
        [{"category": c, "count": n} for c, n in category_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:3]

    return {
        "user_id": user_id,
        "stats": {
            "viewed_items": len(viewed),
            "learning_plans": len(plan_topics),
            "quiz_answered": quiz["answered"],
            "creations": len(creations),
        },
        "viewed": list(viewed.values()),
        "learning_plans": plan_topics[-10:],
        "quiz": quiz,
        "quiz_by_topic": sorted(quiz_by_topic.values(), key=lambda x: x["answered"], reverse=True),
        "creations": creations[-10:],
        "interests": interests,
    }
