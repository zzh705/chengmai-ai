"""学习规划 Agent：生成结构化学习路径（总文档 3.4 / 11.2）。"""

from app.knowledge.search import search as knowledge_search
from app.schemas.learning import LearningDay, LearningPlanRequest
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是承脉 AI 的学习规划师。请根据主题生成循序渐进的学习计划，"
    "只输出 JSON，不要任何解释文字，格式：\n"
    '{"days": [{"day": 1, "title": "主题", "tasks": ["任务1", "任务2"]}]}'
)


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

    user_prompt = (
        f"主题：{req.topic}\n天数：{req.days} 天\n"
        f"学习者水平：{'零基础入门' if req.level == 'beginner' else '有一定了解'}"
        f"{context}\n"
        "要求：每天 2-4 个具体任务，任务要可执行（如'观察一幅XX作品'），"
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
