"""Qwen3 大模型调用封装（OpenAI 兼容协议）。"""

import os

from openai import OpenAI

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
        )
    return _client


def chat(message: str, history: list[dict] | None = None, system: str | None = None) -> str:
    """发送一轮对话，返回模型回答文本。"""
    messages = [{"role": "system", "content": system or DEFAULT_SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": message})

    resp = _get_client().chat.completions.create(
        model=os.getenv("LLM_MODEL", "qwen-plus"),
        messages=messages,
        temperature=0.7,
    )
    return resp.choices[0].message.content or ""
