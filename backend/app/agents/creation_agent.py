# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：活化创作 Agent：传统元素分析-文化语义保护-现代转译三步提示词链，附超时本地兜底方案
# ============================================================
"""活化创作 Agent：传统元素分析 → 文化语义保护 → 现代化方案（总文档 2.5）。"""

import re

from app.knowledge.search import search as knowledge_search
from app.schemas.creation import CreationRequest, CreationResult
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是「承脉 AI 活化实验室」的创意策划师。你必须先尊重传统文化语义，再谈创新。\n"
    "只输出 JSON，不要任何解释文字，格式：\n"
    '{"title": "创意主题", "slogan": "一句传播口号",'
    ' "traditional_elements": ["传统元素1"],'
    ' "modern_carrier": ["现代载体1"],'
    ' "spread_channels": ["传播方式1"],'
    ' "ai_parts": ["AI辅助部分1"],'
    ' "steps": ["可实施步骤1"],'
    ' "guardrails": ["不能随意改变的文化语义1"],'
    ' "materials": ["物料与资源1"],'
    ' "risks": ["风险与边界1"],'
    ' "metrics": ["成效标尺1"]}\n'
    "要求：title 要有画面感与记忆点（可对仗、可悬念，18 字内）；slogan 不超过 16 字、"
    "能直接印在海报/包装上；guardrails 必须基于检索资料明确指出该非遗的核心文化语义"
    "（如符号寓意、工序禁忌）；steps 必须拆成 5-7 个独立数组元素（禁止合并成一条），"
    "每条不超过 50 字；traditional_elements/modern_carrier/spread_channels/ai_parts 各 4-6 条，"
    "每条具体到可执行（写明对象、场景或数量），禁止'加大宣传''提升影响'这类空话。"
    "materials 列 3-5 条落地物料与资源（写清大致数量或规格，并点出可借/可自制的低成本项）；"
    "risks 列 2-4 条执行风险与文化边界（覆盖安全、文化误读、场地或版权等维度，每条带一句规避办法）；"
    "metrics 列 2-4 条可量化成效标尺（如参与人次、完播率、投稿数量，给出可对照的目标量级）。"
    "所有字符串值禁止使用 emoji、颜文字与装饰性图标符号。"
)

_OUTPUT_HINT = {
    "plan": "输出文创/综合创意方案",
    "event": "侧重校园活动策划方案",
    "video": "侧重短视频脚本与传播方案",
    "exhibit": "侧重线下展览/体验展陈方案",
}

_STYLE_HINT = {
    "guochao": "风格：国潮融合（传统符号与现代审美强碰撞，视觉冲击力优先）",
    "serious": "风格：学术严谨（表述克制专业，适配博物馆/学术传播场景）",
    "lively": "风格：活泼轻趣（网感语言、互动游戏化，适合年轻人社交传播）",
}

_AUDIENCE_HINT = {
    "campus": "受众：校园师生（贴合课余时间、社团与校园媒介）",
    "community": "受众：社区居民（贴近日常生活、老少咸宜的参与方式）",
    "overseas": "受众：海外中文学习者（兼顾语言学习与文化理解，降低文化折扣）",
}


def generate_creation(req: CreationRequest) -> tuple[CreationResult, list[str]]:
    """生成活化方案；返回 (结构化结果, 参考的知识库项目名)。"""
    items = knowledge_search(f"{req.heritage} {req.requirement}", top_k=2)
    context = ""
    if items:
        blocks = []
        for it in items:
            block = (
                f"- {it['name']}：{it['description']}\n"
                f"  文化内涵：{it['cultural_meaning']}\n  技艺：{it['craft_process']}"
            )
            if it.get("story"):
                block += f"\n  一分钟讲述：{it['story']}"
            if it.get("hook"):
                block += f"\n  悬念钩子：{it['hook']}"
            blocks.append(block)
        context = f"\n【知识库检索资料（必须依据）】\n" + "\n".join(blocks)

    user_prompt = (
        f"非遗项目：{req.heritage}\n"
        f"用户需求：{req.requirement}\n"
        f"方案类型：{_OUTPUT_HINT.get(req.output_type, _OUTPUT_HINT['plan'])}\n"
        f"{_STYLE_HINT.get(req.style, _STYLE_HINT['guochao'])}\n"
        f"{_AUDIENCE_HINT.get(req.audience, _AUDIENCE_HINT['campus'])}\n"
        f"{context}\n"
        "流程：先从资料中提炼传统元素与不可改变的文化语义，再设计现代化落地方案。\n"
        "字段含义：\n"
        "- title：一句话创意主题（有画面感/记忆点）\n"
        "- slogan：一句传播口号，≤16字，可直接印在海报上\n"
        "- traditional_elements：资料中该非遗的传统元素\n"
        "- modern_carrier：落地的现代载体（如校园活动/文创/小程序）\n"
        "- spread_channels：传播渠道\n"
        "- ai_parts：AI 可辅助完成的部分\n"
        "- steps：实施步骤，5-7 个数组元素，每步一个元素且≤50字，"
        "格式如'第1周：完成XX，产出XX'\n"
        "- guardrails：不能随意改变的文化语义（必须来自资料）\n"
        "- materials：落地物料与资源准备，3-5 条（数量/规格/低成本来源）\n"
        "- risks：执行风险与文化边界，2-4 条（每条附规避办法）\n"
        "- metrics：可量化成效标尺，2-4 条（带目标量级）"
    )
    try:
        data = extract_json(
            llm_chat(user_prompt, system=_SYSTEM, temperature=0.6, timeout=25.0, max_retries=0)
        )
        result = CreationResult(**data)
        # 兜底：模型偶尔把多步挤进一条，按分号/句号拆开
        if len(result.steps) == 1 and len(result.steps[0]) > 60:
            parts = [p.strip() for p in re.split(r"[；。]", result.steps[0]) if p.strip()]
            if len(parts) > 1:
                result.steps = parts
        return result, [it["name"] for it in items]
    except Exception:
        # 超时/解析失败：用知识库资料拼装一份等量结构化方案，保证字段齐全、内容不空
        return _fallback_creation(req, items), [it["name"] for it in items]


def _fallback_creation(req: CreationRequest, items: list[dict]) -> CreationResult:
    """LLM 失败时的本地兜底方案：所有字段保留且依据知识库资料填实，避免空响应。
    名称以用户输入为准（req.heritage），知识库资料仅用于补足文化语义与工序描述。"""
    # 以用户输入的项目名为准，避免 RAG 检索结果错位导致张冠李戴
    name = req.heritage
    primary = items[0] if items else {}
    meaning = primary.get("cultural_meaning") or "传统非遗世代相传的文化语义与象征体系"
    craft = primary.get("craft_process") or "世代传承的技艺流程与师承规矩"
    type_hint = _OUTPUT_HINT.get(req.output_type, _OUTPUT_HINT["plan"])
    return CreationResult(
        title=f"{name}·当代表达计划",
        slogan=f"让{name}走进当代生活",
        traditional_elements=[
            f"{name}的核心文化语义：{meaning[:30]}",
            f"传统工序要诀：{craft[:30]}",
            "代表性符号与纹样须保留原貌",
            "传世作品的形制与色彩规范",
        ],
        modern_carrier=[
            f"校园社团工作坊（{type_hint}）",
            "短视频系列与社交账号",
            "文创衍生品（文具/服饰/家居）",
            "互动小程序或体验展位",
        ],
        spread_channels=[
            "校园社团公众号与社群",
            "短视频平台（抖音/B站/小红书）",
            "线下展览与市集",
            "海外中文学习者社群",
        ],
        ai_parts=[
            "AI 辅助生成文案与脚本",
            "AI 图片生成用于视觉草稿",
            "AI 翻译适配海外传播",
            "AI 数据整理与资料检索",
        ],
        steps=[
            "第1周：资料研读，梳理文化语义与禁忌",
            "第2周：方案设计，确定现代载体与受众",
            "第3周：物料筹备，分工制作",
            "第4周：内容产出，拍摄/排练/制作",
            "第5周：传播投放，多渠道分发",
            "第6周：复盘评估，收集反馈迭代",
        ],
        guardrails=[
            f"不可改变的核心语义：{meaning[:40]}",
            "传统符号不得戏说或魔改",
            "工序核心步骤须保留原貌",
            "尊重传承人署名与地域归属",
        ],
        materials=[
            "基础材料（可借/采购，规格写明）",
            "拍摄设备：手机或入门相机",
            "设计软件：免费在线工具即可",
            "传播物料：海报模板与短文案",
        ],
        risks=[
            "文化误读风险：邀请传承人/教师把关",
            "场地或版权风险：提前确认使用许可",
            "执行偏差风险：分阶段评审、留存过程稿",
        ],
        metrics=[
            "参与人次：目标 50-200 人",
            "内容完播率：≥60%",
            "投稿/互动数量：≥20 条",
        ],
    )
