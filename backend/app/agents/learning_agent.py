"""学习规划 Agent：生成结构化学习路径（总文档 3.4 / 11.2）。

可靠性设计：LLM 短超时 + 一次重试 + 本地兜底计划，
保证接口在模型抖动时也能快速返回结构化结果，前端不会"无反馈"。
"""

from app.schemas.learning import LearningDay, LearningPlanRequest
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是承脉 AI 的学习规划师。根据主题生成循序渐进的学习计划，"
    "只输出 JSON，不要任何解释文字，格式：\n"
    '{"days": [{"day": 1, "title": "主题", "tasks": ["任务1", "任务2"]}]}\n'
    "所有字符串值禁止使用 emoji、颜文字与装饰性图标符号。"
)


_GOAL_TEXT = {
    "understand": "目标是入门了解：建立整体认知即可，不必深究",
    "master": "目标是深入掌握：安排临摹/研读/对比分析等深度任务",
    "teach": "目标是能讲给别人听：每天安排一个'向他人转述/做小分享'的输出任务",
}


def _task_count(daily_minutes: int) -> int:
    """按每日时长换算任务量：30分钟2个、60分钟3个、90分钟以上4个。"""
    if daily_minutes <= 30:
        return 2
    if daily_minutes <= 60:
        return 3
    return 4


# 学习弧线：知识 → 理解 → 实践 → 创作 → 传播（兜底计划按天数映射到弧线上）
_ARC_TASKS = [
    (
        "建立整体认知",
        [
            "通读「{t}」的入门介绍资料，用自己的话写下 3 个核心关键词",
            "观看一段「{t}」相关纪录短片，记录它的历史渊源与流布地区",
            "整理一张「{t}」词汇卡：核心术语、代表人物、经典作品各 2 个",
            "画出「{t}」的一页纸知识地图：起源、发展、现状三支",
        ],
    ),
    (
        "拆解核心要素",
        [
            "拆解「{t}」的核心构成要素（材料、流程、角色或结构），列成清单",
            "找出「{t}」的 2 个代表性流派或地域变体，对比记录差异点",
            "选一件「{t}」经典作品，写出 3 个具体观察点（材质、技法、纹样等）",
            "查阅「{t}」代表性传承人的资料，总结其技艺特点",
        ],
    ),
    (
        "深入研读理解",
        [
            "精读一篇「{t}」的深度文章或论文节选，摘录 5 个要点并写一句自己的理解",
            "分析「{t}」背后的文化内涵：它为何在当地人群中重要",
            "对比「{t}」与相近门类的一项非遗，写出 2 个相同点与 2 个不同点",
            "梳理「{t}」当下面临的传承困境与已有的保护措施",
        ],
    ),
    (
        "动手实践体验",
        [
            "跟学一段「{t}」的基础教学视频，完成一个最小练习并拍照记录",
            "按照拆解出的流程，亲手复现「{t}」的一个基础环节（允许简化材料）",
            "参观或云游一处「{t}」相关场馆/工坊，记录 3 个现场细节",
            "采访身边了解「{t}」的人（或整理一段传承人访谈），记下原话",
        ],
    ),
    (
        "创作与输出",
        [
            "以「{t}」为灵感完成一件小创作（图文、短视频脚本或手作均可）",
            "写一篇 300 字的「{t}」科普短文，发给你的一位朋友阅读",
            "制作一张「{t}」知识卡片：一张图 + 三个要点",
            "录一段 1 分钟口播，向不了解的人介绍「{t}」",
        ],
    ),
]


def _fallback_plan(req: LearningPlanRequest) -> list[LearningDay]:
    """LLM 多次失败时的本地兜底计划：按学习弧线生成，保证接口永远有响应。"""
    n = _task_count(req.daily_minutes)
    days: list[LearningDay] = []
    for i in range(req.days):
        # 把天数均匀映射到弧线上，最后一天固定为产出/传播
        arc_i = len(_ARC_TASKS) - 1 if i == req.days - 1 else round(
            i * (len(_ARC_TASKS) - 2) / max(req.days - 1, 1)
        )
        title, pool = _ARC_TASKS[arc_i]
        tasks = [pool[k % len(pool)].format(t=req.topic) for k in range(n)]
        if req.goal == "teach":
            tasks[-1] = f"把今天学到的「{req.topic}」内容讲给一个人听，并记下对方的提问"
        days.append(LearningDay(day=i + 1, title=title, tasks=tasks))
    return days


def _parse_days(data: dict, req: LearningPlanRequest) -> list[LearningDay] | None:
    """校验模型输出：结构不符或任务为空则视为失败（触发重试）。"""
    raw = data.get("days")
    if not isinstance(raw, list) or not raw:
        return None
    try:
        days = [LearningDay(**d) for d in raw[: req.days]]
    except (TypeError, ValueError):
        return None
    if any(not d.tasks for d in days):
        return None
    return days


def generate_plan(req: LearningPlanRequest, items: list[dict]) -> list[LearningDay]:
    """生成学习路径；结合知识库检索到的项目信息。检索由路由层完成并传入。"""
    context = ""
    if items:
        context = "\n".join(
            f"- {it['name']}（{it['category']}，{it['region']}）：{it['description'][:120]}"
            for it in items
        )
        context = f"\n知识库相关项目：\n{context}"

    n = _task_count(req.daily_minutes)
    user_prompt = (
        f"主题：{req.topic}\n天数：{req.days} 天\n"
        f"学习者水平：{'零基础入门' if req.level == 'beginner' else '有一定了解'}\n"
        f"{_GOAL_TEXT.get(req.goal, _GOAL_TEXT['understand'])}\n"
        f"每天可投入约 {req.daily_minutes} 分钟，每天安排 {n} 个任务，"
        "单个任务的用时需与该时长相符\n"
        f"{context}\n"
        "要求：任务要具体可执行（如'观察一幅XX作品'并写出3个观察点），"
        "最后一天安排产出/传播类任务，体现'知识→理解→实践→创作→传播'闭环。"
    )

    # 短超时 + 低温度：结构化输出求稳不求花哨；失败后换更直白的提示重试一次
    prompts = [user_prompt, user_prompt + "\n重申：只输出给定格式的 JSON，不要输出任何其他内容。"]
    for prompt in prompts:
        try:
            data = extract_json(
                llm_chat(prompt, system=_SYSTEM, temperature=0.4, timeout=30.0, max_retries=1)
            )
            days = _parse_days(data, req)
            if days is not None:
                # 天数不足时用弧线计划补齐
                if len(days) < req.days:
                    pad = _fallback_plan(req)[len(days) :]
                    days += [LearningDay(day=len(days) + 1 + i, title=d.title, tasks=d.tasks) for i, d in enumerate(pad)]
                return days
        except Exception:
            continue
    return _fallback_plan(req)
