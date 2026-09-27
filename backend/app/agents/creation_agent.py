"""活化创作 Agent：传统元素分析 → 文化语义保护 → 现代化方案（总文档 2.5）。"""

import re

from app.knowledge.search import search as knowledge_search
from app.schemas.creation import CreationRequest, CreationResult
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是「承脉 AI 活化实验室」的创意策划师。你必须先尊重传统文化语义，再谈创新。\n"
    "只输出 JSON，不要任何解释文字，格式：\n"
    '{"title": "创意主题",'
    ' "traditional_elements": ["传统元素1"],'
    ' "modern_carrier": ["现代载体1"],'
    ' "spread_channels": ["传播方式1"],'
    ' "ai_parts": ["AI辅助部分1"],'
    ' "steps": ["可实施步骤1"],'
    ' "guardrails": ["不能随意改变的文化语义1"]}\n'
    "要求：guardrails 必须基于检索资料明确指出该非遗的核心文化语义（如符号寓意、"
    "工序禁忌）；steps 必须拆成 4-6 个独立数组元素（禁止合并成一条），每条不超过 50 字；"
    "traditional_elements/modern_carrier/spread_channels/ai_parts 各 3-5 条。"
)

_OUTPUT_HINT = {
    "plan": "输出文创/综合创意方案",
    "event": "侧重校园活动策划方案",
    "video": "侧重短视频脚本与传播方案",
}


def generate_creation(req: CreationRequest) -> tuple[CreationResult, list[str]]:
    """生成活化方案；返回 (结构化结果, 参考的知识库项目名)。"""
    items = knowledge_search(f"{req.heritage} {req.requirement}", top_k=2)
    context = ""
    if items:
        context = "\n".join(
            f"- {it['name']}：{it['description']}\n  文化内涵：{it['cultural_meaning']}\n  技艺：{it['craft_process']}"
            for it in items
        )
        context = f"\n【知识库检索资料（必须依据）】\n{context}"

    user_prompt = (
        f"非遗项目：{req.heritage}\n"
        f"用户需求：{req.requirement}\n"
        f"方案类型：{_OUTPUT_HINT.get(req.output_type, _OUTPUT_HINT['plan'])}"
        f"{context}\n"
        "流程：先从资料中提炼传统元素与不可改变的文化语义，再设计现代化落地方案。\n"
        "字段含义：\n"
        "- title：一句话创意主题\n"
        "- traditional_elements：资料中该非遗的传统元素\n"
        "- modern_carrier：落地的现代载体（如校园活动/文创/小程序）\n"
        "- spread_channels：传播渠道\n"
        "- ai_parts：AI 可辅助完成的部分\n"
        "- steps：实施步骤，4-6 个数组元素，每步一个元素且≤50字，"
        "格式如'第1周：完成XX，产出XX'\n"
        "- guardrails：不能随意改变的文化语义（必须来自资料）"
    )
    data = extract_json(llm_chat(user_prompt, system=_SYSTEM))
    result = CreationResult(**data)
    # 兜底：模型偶尔把多步挤进一条，按分号/句号拆开
    if len(result.steps) == 1 and len(result.steps[0]) > 60:
        parts = [p.strip() for p in re.split(r"[；。]", result.steps[0]) if p.strip()]
        if len(parts) > 1:
            result.steps = parts
    return result, [it["name"] for it in items]
