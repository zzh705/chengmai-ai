"""测验生成 Agent：检索依据 → 选择/判断题（总文档 3.5）。"""

from app.knowledge.search import search as knowledge_search
from app.schemas.quiz import QuizQuestion, QuizRequest
from app.services.llm import chat as llm_chat
from app.utils.json_parse import extract_json

_SYSTEM = (
    "你是承脉 AI 的非遗出题人。只输出 JSON，格式：\n"
    '{"questions": [{"type": "choice", "question": "…",'
    ' "options": ["A选项", "B选项", "C选项", "D选项"],'
    ' "answer": "正确选项的完整文本", "explanation": "解析（点明知识依据）"}]}\n'
    "规则：type 只能是 choice 或 judge；judge 题 options 固定为 [\"正确\", \"错误\"]；"
    "answer 必须与 options 中某一项完全一致；干扰项要 plausible 但明确错误；"
    "题目必须基于给定资料，explanation 要说清为什么。"
    "所有字符串值禁止使用 emoji、颜文字与装饰性图标符号。"
)


def generate_quiz(req: QuizRequest) -> tuple[list[QuizQuestion], list[str]]:
    """生成测验题；返回 (题目列表, 参考项目名)。"""
    items = knowledge_search(req.topic, top_k=2)
    context = ""
    if items:
        context = "\n".join(
            f"- {it['name']}：{it['description']}\n  技艺：{it['craft_process']}"
            for it in items
        )
        context = f"\n【知识库检索资料（出题唯一依据）】\n{context}"

    user_prompt = (
        f"主题：{req.topic}\n题目数量：{req.count}\n难度：{req.difficulty}\n{context}"
    )
    data = extract_json(llm_chat(user_prompt, system=_SYSTEM))
    questions = [QuizQuestion(id=i + 1, **q) for i, q in enumerate(data.get("questions", []))]
    return questions[: req.count], [it["name"] for it in items]
