"""POST /api/chat — 承脉 AI 对话接口（合同见 docs/api_contract.md）。"""

import uuid

from fastapi import APIRouter

from app.agents.intent import detect_intent
from app.prompts.perspectives import build_system_prompt
from app.schemas.chat import (
    Action,
    ChatRequest,
    ChatResponse,
    EvidenceScore,
    RelatedItem,
    Source,
)
from app.services.llm import chat as llm_chat

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    """承脉 AI 对话：意图识别 → 构建视角提示词 → 调用 Qwen3 → 按合同返回。"""
    intent = detect_intent(req.message)

    system_prompt = build_system_prompt(req.mode)
    answer = llm_chat(req.message, system=system_prompt)

    actions = [
        Action(type="learning_plan", label="生成学习路线"),
        Action(type="quiz", label="生成测试题"),
    ]
    if intent == "CREATION":
        actions.insert(0, Action(type="lab", label="打开活化实验室"))

    return ChatResponse(
        code=0,
        session_id=req.session_id or str(uuid.uuid4()),
        answer=answer,
        sources=[],  # RAG 阶段接入，合同要求字段必须存在
        related_items=[],
        actions=actions,
        evidence_score=EvidenceScore(),
        intent=intent,
    )
