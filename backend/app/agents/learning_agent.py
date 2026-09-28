"""学习规划 Agent：生成结构化学习路径（总文档 3.4 / 11.2）。"""

from app.knowledge.search import search as knowledge_search
from app.schemas.learning import LearningDay, LearningPlanRequest
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是承脉 AI 的学习规划师。请根据主题生成循序渐进的学习计划，"
    "只输出 JSON，不要任何解释文字，格式：\n"
    '{"days": [{"day": 1, "title": "主题", "tasks": ["任务1", "任务2"]}]}'
    "所有字符串值禁止使用 emoji、颜文字与装饰性图标符号。"
)


_GOAL_TEXT = {
    "understand": "目标是入门了解：建立整体认知即可，不必深究",
    "master": "目标是深入掌握：安排临摹/研读/对比分析等深度任务",
    "teach": "目标是能讲给别人听：每天安排一个'向他人转述/做小分享'的输出任务",
}


def generate_plan(req: LearningPlanRequest) -> list[LearningDay]:
    """生成学习路径；优先结合知识库检索到的项目信息。"""
    items = knowledge_search(req.topic, top_k=2)
    context = ""
    if items:
        context = "\n".join(
            f"- {it['name']}（{it['category']}，{it['region']}）：{it['description'][:120]}"
            for it in items
        )
        context = f"\n知识库相关项目：\n{context}"

    # 按每日时长换算任务量：30分钟1-2个、60分钟2-3个、90分钟以上3-4个
    if req.daily_minutes <= 30:
        task_count = "1-2"
    elif req.daily_minutes <= 60:
        task_count = "2-3"
    else:
        task_count = "3-4"

    user_prompt = (
        f"主题：{req.topic}\n天数：{req.days} 天\n"
        f"学习者水平：{'零基础入门' if req.level == 'beginner' else '有一定了解'}\n"
        f"{_GOAL_TEXT.get(req.goal, _GOAL_TEXT['understand'])}\n"
        f"每天可投入约 {req.daily_minutes} 分钟，每天安排 {task_count} 个任务，"
        "单个任务的用时需与该时长相符\n"
        f"{context}\n"
        "要求：任务要具体可执行（如'观察一幅XX作品'并写出3个观察点），"
        "最后一天安排产出/传播类任务，体现'知识→理解→实践→创作→传播'闭环。"
    )

    data = extract_json(llm_chat(user_prompt, system=_SYSTEM))
    days = [LearningDay(**d) for d in data.get("days", [])][: req.days]
    if len(days) < req.days:
        days += [
            LearningDay(day=len(days) + 1, title="巩固复习", tasks=["回顾笔记", "完成知识自测"])
            for _ in range(req.days - len(days))
        ]
    return days
