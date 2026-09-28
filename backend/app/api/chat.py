"""POST /api/chat — 承脉 AI 对话接口（合同见 docs/api_contract.md）。"""

import json
import uuid
from typing import Iterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

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
from app.services.llm import chat_stream as llm_chat_stream

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


def _actions_of(intent: str) -> list[Action]:
    actions = [
        Action(type="learning_plan", label="生成学习路线"),
        Action(type="quiz", label="生成测试题"),
    ]
    if intent == "CREATION":
        actions.insert(0, Action(type="lab", label="打开活化实验室"))
    if intent == "STORY":
        actions.insert(0, Action(type="story", label="生成完整故事"))
    return actions


def _prepare(req: ChatRequest):
    """检索 → 意图识别 → 组装系统提示词（LLM 调用前的全部快速阶段）。"""
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
    return items, sources, intent, session_id, system_prompt, history


def _meta_payload(
    session_id: str,
    items: list[dict],
    sources: list[Source],
    intent: str,
) -> dict:
    """流式接口的 meta 事件：LLM 出字前先送达，前端立即渲染证据链。"""
    return {
        "type": "meta",
        "session_id": session_id,
        "sources": [s.model_dump() for s in sources],
        "related_items": [
            RelatedItem(id=it["id"], name=it["name"], type="heritage").model_dump()
            for it in items
        ],
        "actions": [a.model_dump() for a in _actions_of(intent)],
        "evidence_score": _evidence_score(items, sources).model_dump(),
        "intent": intent,
    }


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    """承脉 AI 对话：检索 → 意图识别 → 视角提示词+资料注入 → Qwen3 → 证据链返回。"""
    items, sources, intent, session_id, system_prompt, history = _prepare(req)
    answer = llm_chat(req.message, history=history, system=system_prompt)

    session_store.append(session_id, "user", req.message)
    session_store.append(session_id, "assistant", answer)

    return ChatResponse(
        code=0,
        session_id=session_id,
        answer=answer,
        sources=sources,
        related_items=[
            RelatedItem(id=it["id"], name=it["name"], type="heritage") for it in items
        ],
        actions=_actions_of(intent),
        evidence_score=_evidence_score(items, sources),
        intent=intent,
    )


def _stream_events(req: ChatRequest) -> Iterator[str]:
    """SSE 事件流：meta（毫秒级）→ delta*（边生成边推送）→ done。"""
    items, sources, intent, session_id, system_prompt, history = _prepare(req)
    yield _sse(_meta_payload(session_id, items, sources, intent))

    parts: list[str] = []
    try:
        for delta in llm_chat_stream(req.message, history=history, system=system_prompt):
            parts.append(delta)
            yield _sse({"type": "delta", "text": delta})
    except Exception:
        if not parts:
            raise
        # 半途失败：已生成部分仍写入会话，避免上下文断裂
        pass

    answer = "".join(parts)
    session_store.append(session_id, "user", req.message)
    session_store.append(session_id, "assistant", answer)
    yield _sse({"type": "done"})


@router.post("/chat/stream")
def chat_stream(req: ChatRequest) -> StreamingResponse:
    """流式对话接口：证据链先到，答案逐字到达（首屏延迟 = 首 token 延迟）。"""
    return StreamingResponse(
        _stream_events(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
