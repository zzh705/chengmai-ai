# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：传承档案存储：四类成长事件流的落库、聚合统计与徽章/称号解锁判定
# ============================================================
"""用户传承档案：进度事件记录与聚合（内存版，Phase 5 迁移到 PostgreSQL）。"""

import time
from collections import defaultdict

from app.knowledge.search import _load_items

_events: dict[str, list[dict]] = defaultdict(list)

_CATEGORY_BY_ID = None  # 延迟加载

# 演示账号：首次读取档案时预置满级成长记录（等级 / 集印 / 徽章全部拉满）
_DEMO_USER = "追光小队"


def _category_of(item_id: str | None) -> str:
    global _CATEGORY_BY_ID
    if _CATEGORY_BY_ID is None:
        _CATEGORY_BY_ID = {it["id"]: it["category"] for it in _load_items()}
    return _CATEGORY_BY_ID.get(item_id or "", "其他")


def record(user_id: str, event_type: str, item_id: str | None = None,
           item_name: str | None = None, detail: dict | None = None) -> None:
    """记录一次传承行为事件。

    detail 中可携带 _ts（形如 "YYYY-MM-DD HH:MM"）补卡历史时间；
    事件落库时 _ts 从 detail 中移除，避免污染返回给前端的 detail 字段。
    """
    d = dict(detail or {})
    back_ts = d.pop("_ts", None)
    _events[user_id].append(
        {
            "event_type": event_type,
            "item_id": item_id,
            "item_name": item_name,
            "detail": d,
            "ts": back_ts if back_ts else time.strftime("%Y-%m-%d %H:%M"),
        }
    )


def _seed_demo(user_id: str) -> None:
    """演示账号「追光小队」首次读取档案时，预置满级成长记录。

    满级称号需 1350 EXP；此处 80 次浏览 + 5 份计划 + 40 次答题 + 3 次创作 = 1480 EXP，
    并覆盖 8 个活跃日，同时满足「集印册」8 枚与「传承徽章」6 枚的全部解锁条件。
    只在该账号尚无任何事件时写入一次，不影响其他用户。
    """
    if user_id != _DEMO_USER or _events.get(user_id):
        return
    items = _load_items()
    if not items:
        return

    # 均匀抽样 80 项，保证浏览记录覆盖多个门类（兴趣画像不为空）
    step = max(1, len(items) // 80)
    picked = items[::step][:80]
    if len(picked) < 80:  # 数据量异常时兜底，不足则循环补齐
        picked = (picked * 2)[:80]

    def stamp(day: int) -> str:
        return time.strftime("%Y-%m-%d %H:%M", time.localtime(time.time() - day * 86400))

    # 近 8 天，每天 10 项浏览
    for d in range(7, -1, -1):
        for it in picked[(7 - d) * 10 : (7 - d) * 10 + 10]:
            record(user_id, "view", it["id"], it["name"], {"_ts": stamp(d)})

    # 5 份学习计划
    for d, topic in zip((6, 4, 3, 1, 0), ("传统技艺", "传统美术", "传统音乐", "传统戏剧", "民俗")):
        record(user_id, "learning_plan", None, topic, {"_ts": stamp(d)})

    # 40 次答题，38 对 2 错（正确率 95%，满足 30 题 + 90% 的最高徽章）
    for i in range(40):
        record(
            user_id,
            "quiz_answer",
            None,
            "综合",
            {"correct": i not in (7, 23), "_ts": stamp(7 - i // 5)},
        )

    # 3 次活化创作
    for d, topic in zip((5, 2, 0), ("苏绣纹样活化", "皮影角色再设计", "扎染配色方案")):
        record(user_id, "creation", None, topic, {"_ts": stamp(d)})


def profile(user_id: str) -> dict:
    """聚合生成个人非遗成长档案。"""
    _seed_demo(user_id)
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
            category_counts[_category_of(e["item_id"]).split(" · ")[0]] += 1
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
    )[:6]

    # 近 28 天足迹热力：档案页日历用（按天聚合全部事件）
    day_counts: dict[str, int] = defaultdict(int)
    for e in events:
        day_counts[e["ts"][:10]] += 1
    cutoff = time.strftime("%Y-%m-%d", time.localtime(time.time() - 27 * 86400))
    activity = [
        {"date": d, "count": n}
        for d, n in sorted(day_counts.items())
        if cutoff <= d <= time.strftime("%Y-%m-%d")
    ]

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
        "activity": activity,
        # 最近足迹时间线（新的在前，档案页时间轴用）
        "recent_events": [
            {"type": e["event_type"], "name": e["item_name"] or "", "ts": e["ts"]}
            for e in events[-12:]
        ][::-1],
    }
