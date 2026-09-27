"""活化创作 Agent：传统元素分析 → 文化语义保护 → 现代化方案（总文档 2.5）。"""

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
    "工序禁忌）；steps 必须 4-6 条、具体可落地（含时间/分工/产出物）；"
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
        "流程：先从资料中提炼传统元素与不可改变的文化语义，再设计现代化落地方案。"
    )
    data = extract_json(llm_chat(user_prompt, system=_SYSTEM))
    return CreationResult(**data), [it["name"] for it in items]
