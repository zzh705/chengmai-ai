"""POST /api/chat — 承脉 AI 对话接口（合同见 docs/api_contract.md）。"""

import uuid

from fastapi import APIRouter

from app.agents.intent import detect_intent
from app.knowledge.search import credibility_of, search as knowledge_search, sources_of
from app.prompts.perspectives import build_system_prompt
from app.schemas.chat import (
    Action,
    ChatRequest,
    ChatResponse,
    EvidenceScore,
    RelatedItem,
    Source,
)
from app.services import session_store
from app.services.llm import chat as llm_chat

router = APIRouter(prefix="/api", tags=["chat"])


def _to_sources(items: list[dict]) -> list[Source]:
    """合并去重检索结果关联的所有来源。"""
    seen: dict[str, Source] = {}
    for item in items:
        for s in sources_of(item):
            seen[s["id"]] = Source(**s)
    return list(seen.values())


def _evidence_score(items: list[dict], sources: list[Source]) -> EvidenceScore:
    """计算证据分（总文档 10.3，工程指标而非事实真伪证明）。"""
    if not items:
        return EvidenceScore()
    relevance = round(min(0.99, 0.4 + 0.06 * items[0]["score"]), 2)
    credibility = credibility_of([s.model_dump() for s in sources])
    coverage = round(min(1.0, len(items) / 2), 2)
    total = round(relevance * 0.5 + credibility * 0.3 + coverage * 0.2, 2)
    return EvidenceScore(
        relevance=relevance, credibility=credibility, coverage=coverage, total=total
    )


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    """承脉 AI 对话：检索 → 意图识别 → 视角提示词+资料注入 → Qwen3 → 证据链返回。"""
    items = knowledge_search(req.message)
    sources = _to_sources(items)
    intent = detect_intent(req.message)
    session_id = req.session_id or str(uuid.uuid4())

    system_prompt = build_system_prompt(req.mode)
    if items:
        context = "\n\n".join(
            f"【{it['name']}】{it['description']}\n技艺：{it['craft_process']}\n内涵：{it['cultural_meaning']}"
            for it in items
        )
        system_prompt += f"\n\n以下是知识库检索到的可信资料，回答时优先依据：\n{context}"

    history = session_store.get_history(session_id)
    answer = llm_chat(req.message, history=history, system=system_prompt)

    session_store.append(session_id, "user", req.message)
    session_store.append(session_id, "assistant", answer)

    actions = [
        Action(type="learning_plan", label="生成学习路线"),
        Action(type="quiz", label="生成测试题"),
    ]
    if intent == "CREATION":
        actions.insert(0, Action(type="lab", label="打开活化实验室"))
    if intent == "STORY":
        actions.insert(0, Action(type="story", label="生成完整故事"))

    return ChatResponse(
        code=0,
        session_id=session_id,
        answer=answer,
        sources=sources,
        related_items=[
            RelatedItem(id=it["id"], name=it["name"], type="heritage") for it in items
        ],
        actions=actions,
        evidence_score=_evidence_score(items, sources),
        intent=intent,
    )
