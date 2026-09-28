"""故事生成 Agent：检索依据 → 结构化故事（总文档 3.6 / 案例三）。"""

from app.knowledge.search import search as knowledge_search
from app.schemas.story import StoryRequest, StorySection
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是承脉 AI 的非遗故事写作者。只输出 JSON，格式：\n"
    '{"title": "故事标题",'
    ' "sections": [{"heading": "开头", "content": "…"}],'
    ' "spread_tips": ["传播建议1"]}\n'
    "sections 固定 4-5 段：开头（钩子）、文化背景、核心内容、结尾（升华）；"
    "spread_tips 2-3 条（适合目标听众的传播渠道与角度）。"
    "所有字符串值禁止使用 emoji、颜文字与装饰性图标符号。"
)


def generate_story(req: StoryRequest) -> tuple[str, list[StorySection], list[str], list[str]]:
    """生成故事；返回 (标题, 段落, 传播建议, 参考项目名)。"""
    items = knowledge_search(req.topic, top_k=2)
    context = ""
    if items:
        context = "\n".join(
            f"- {it['name']}：{it['description']}\n  文化内涵：{it['cultural_meaning']}"
            for it in items
        )
        context = f"\n【知识库检索资料（事实必须依据它）】\n{context}"

    user_prompt = (
        f"主题：{req.topic}\n目标听众：{req.audience}\n时长：约 {req.minutes} 分钟\n"
        f"叙事视角：{req.mode}\n{context}\n"
        "要求：语言契合目标听众；涉及历史事实时必须与资料一致，不编造。"
    )
    data = extract_json(llm_chat(user_prompt, system=_SYSTEM))
    sections = [StorySection(**s) for s in data.get("sections", [])]
    return data.get("title", req.topic), sections, data.get("spread_tips", []), [
        it["name"] for it in items
    ]
