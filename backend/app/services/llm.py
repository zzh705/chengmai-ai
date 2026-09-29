"""Qwen3 大模型调用封装（OpenAI 兼容协议）。"""

import os

from openai import OpenAI

from app.utils.text_clean import strip_emoji

_client: OpenAI | None = None

DEFAULT_SYSTEM_PROMPT = (
    "你是「承脉 AI」，一个面向中华非物质文化遗产的垂直领域智能体。"
    "回答要求：准确、有据可依、面向青年用户通俗易懂；"
    "涉及非遗知识时优先依据给定资料，不确定时明确说明。"
)


def _get_client() -> OpenAI:
    """惰性创建客户端：首次调用时 .env 已由 main.py 加载完毕。"""
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
            api_key=os.getenv("LLM_API_KEY"),
            timeout=45.0,
            max_retries=2,
        )
    return _client


def _build_messages(
    message: str, history: list[dict] | None, system: str | None
) -> list[dict]:
    messages = [{"role": "system", "content": system or DEFAULT_SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": message})
    return messages


def chat(
    message: str,
    history: list[dict] | None = None,
    system: str | None = None,
    temperature: float = 0.7,
) -> str:
    """发送一轮对话，返回模型回答文本。"""
    resp = _get_client().chat.completions.create(
        model=os.getenv("LLM_MODEL", "qwen-plus"),
        messages=_build_messages(message, history, system),
        temperature=temperature,
    )
    return strip_emoji(resp.choices[0].message.content or "")


def chat_stream(
    message: str, history: list[dict] | None = None, system: str | None = None
):
    """流式对话：逐段 yield 回答增量，首 token 延迟即首屏可见延迟。"""
    stream = _get_client().chat.completions.create(
        model=os.getenv("LLM_MODEL", "qwen-plus"),
        messages=_build_messages(message, history, system),
        temperature=0.7,
        stream=True,
    )
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            text = strip_emoji(delta)
            if text:
                yield text
