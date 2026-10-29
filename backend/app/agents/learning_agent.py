# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：核心原创：学习计划五日分片错峰并发规划 + 五阶段学习弧线兜底，30 天大计划 20 余秒完整返回且内容为模型量身定制
# ============================================================
"""学习规划 Agent：生成结构化学习路径（总文档 3.4 / 11.2）。

长计划并行分片生成：
- 一次性让模型生成 30 天（约 90 个任务、2400+ token）实测需 70s+，必然超时；
  现把整份计划按每片最多 5 天切开，各片并发调用模型，单片输出小（约 14s 返回），
  30 天计划 6 片并发后整体约 15-20s 即可拿到模型量身定制的完整内容。
- 每片独立短超时且不重试；单片因限流/抖动失败时，仅该段回落本地弧线计划，
  其余各片仍是模型内容，接口永远能快速、完整地返回。
"""

from concurrent.futures import ThreadPoolExecutor
import time

from app.schemas.learning import LearningDay, LearningPlanRequest
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

# 分片参数：单片天数越小输出越少、越快；30 天最多 6 片并发
CHUNK_DAYS = 5
# 单片超时：模型在 6 路并发限流时偶发 >20s 才回，放宽到 26s 以保住定制内容
CHUNK_TIMEOUT = 26.0
# 分片错峰间隔：避免 6 路请求同一瞬刻打出触发 QPS 限流导致集体走兜底
CHUNK_STAGGER = 0.4
_MAX_WORKERS = 6

_SYSTEM = (
    "你是承脉 AI 的学习规划师。根据主题生成循序渐进的学习计划，"
    "只输出 JSON，不要任何解释文字，格式：\n"
    '{"days": [{"day": 1, "title": "主题", "tasks": ["任务1", "任务2"]}]}\n'
    "day 字段必须使用题目指定的绝对天数编号。"
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


# 学习弧线五阶段：分片时按天数比例告诉模型本片所处阶段，保证各片连贯不重复
def _phase_of(day: int, total: int) -> str:
    p = day / max(total, 1)
    if p <= 0.20:
        return "知识启蒙（建立整体认知、了解源流脉络与核心术语）"
    if p <= 0.45:
        return "拆解研读（拆解核心要素、对比流派变体、精读资料）"
    if p <= 0.70:
        return "动手实践（跟学练习、复现基础环节、实地或云游走访）"
    if p <= 0.90:
        return "创作转化（完成小创作、撰写科普文、制作知识卡片）"
    return "传播出师（向他人讲解、录制口播、产出结业作品）"


# 兜底弧线计划的任务池（单片失败时按天取用，保证结构完整）
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
    """某片失败时的本地弧线计划：按学习弧线生成，保证该段永远有内容。"""
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


def _build_context(items: list[dict]) -> str:
    if not items:
        return ""
    lines = "\n".join(
        f"- {it['name']}（{it['category']}，{it['region']}）：{it['description'][:120]}"
        for it in items
    )
    return f"\n知识库相关项目：\n{lines}\n"


def _chunk_prompt(req: LearningPlanRequest, context: str, start: int, end: int) -> str:
    """构造单个分片的提示：明确全局信息 + 本片天数区间 + 所处学习阶段。"""
    n = _task_count(req.daily_minutes)
    total = req.days
    span = end - start + 1
    phase_hint = f"从「{_phase_of(start, total)}」推进到「{_phase_of(end, total)}」"
    last_hint = ""
    if end >= total:
        last_hint = (
            f"本片含全计划最后一天（第 {total} 天），该天必须安排产出/传播类出师任务，"
            "收束'知识→理解→实践→创作→传播'闭环。"
        )
    return (
        f"主题：{req.topic}\n"
        f"这是一份共 {total} 天学习计划中的【第 {start} 天至第 {end} 天】分片（本片 {span} 天）。\n"
        f"学习者水平：{'零基础入门' if req.level == 'beginner' else '有一定了解'}\n"
        f"{_GOAL_TEXT.get(req.goal, _GOAL_TEXT['understand'])}\n"
        f"每天可投入约 {req.daily_minutes} 分钟，每天安排 {n} 个与该时长相符的任务。\n"
        f"{context}"
        f"本片所处学习阶段：{phase_hint}；任务要与该阶段匹配、逐日递进，"
        "并与其他分片衔接、不要重复。\n"
        f"{last_hint}"
        f"请只生成本片这 {span} 天（第 {start} 至第 {end} 天），"
        "day 字段使用上述绝对编号，任务要具体可执行（写明观察什么、产出什么）。\n"
        "重申：只输出给定格式的 JSON，不要输出任何其他内容。"
    )


def _generate_chunk(
    req: LearningPlanRequest, context: str, start: int, end: int
) -> list[LearningDay] | None:
    """生成第 start 至 end 天（含）这一片；结构不符或超时返回 None，交由调用方兜底。"""
    try:
        data = extract_json(
            llm_chat(
                _chunk_prompt(req, context, start, end),
                system=_SYSTEM,
                temperature=0.4,
                timeout=CHUNK_TIMEOUT,
                max_retries=0,
            )
        )
        raw = data.get("days")
        if not isinstance(raw, list) or not raw:
            return None
        wanted = set(range(start, end + 1))
        days: list[LearningDay] = []
        for d in raw:
            if not isinstance(d, dict):
                continue
            day_no = d.get("day")
            tasks = d.get("tasks")
            if not isinstance(day_no, int) or day_no not in wanted:
                continue
            if not isinstance(tasks, list) or not tasks:
                continue
            tasks = [str(t).strip() for t in tasks if isinstance(t, str) and str(t).strip()]
            if not tasks:
                continue
            title = str(d.get("title") or "").strip() or "循序渐进"
            days.append(LearningDay(day=day_no, title=title, tasks=tasks))
        return days or None
    except Exception:
        return None


def _chunk_ranges(total: int) -> list[tuple[int, int]]:
    """把 total 天切成若干 1-based 闭区间，每片不超过 CHUNK_DAYS 天。"""
    ranges: list[tuple[int, int]] = []
    start = 1
    while start <= total:
        end = min(start + CHUNK_DAYS - 1, total)
        ranges.append((start, end))
        start = end + 1
    return ranges


def generate_plan(req: LearningPlanRequest, items: list[dict]) -> list[LearningDay]:
    """生成学习路径；多片并发，单片失败仅该段回落弧线计划。"""
    context = _build_context(items)
    ranges = _chunk_ranges(req.days)

    by_day: dict[int, LearningDay] = {}
    if len(ranges) == 1:
        # 小计划（≤5 天）单片直接调用，省去线程池开销
        st, en = ranges[0]
        got = _generate_chunk(req, context, st, en)
        if got:
            for d in got:
                if 1 <= d.day <= req.days:
                    by_day[d.day] = d
    else:
        # 【承脉 AI 原创算法】长计划分片错峰并发：各片 0.4s 间隔提交避开 QPS 限流，
        # 整体耗时≈最晚一片（约 14-28s），单片失败仍有弧线兜底
        with ThreadPoolExecutor(max_workers=min(len(ranges), _MAX_WORKERS)) as pool:
            futures: dict = {}
            for idx, (st, en) in enumerate(ranges):
                if idx:
                    time.sleep(CHUNK_STAGGER)
                futures[pool.submit(_generate_chunk, req, context, st, en)] = (st, en)
            for fut in futures:
                st, en = futures[fut]
                try:
                    got = fut.result()
                except Exception:
                    got = None
                if got:
                    for d in got:
                        if 1 <= d.day <= req.days:
                            by_day[d.day] = d

    # 以完整弧线计划为骨架，用模型生成的各天覆盖，缺失天（失败片）保留弧线兜底
    return [by_day.get(fb.day, fb) for fb in _fallback_plan(req)]
