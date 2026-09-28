"""LLM 输出文本清洗：去除模型自作主张加入的 emoji 与装饰符号。"""

import re

_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u27bf"
    "\ufe0e\ufe0f\u200d\u20e3"
    "\U0001F3FB-\U0001F3FF\U0001F1E6-\U0001F1FF"
    "\U000E0020-\U000E007F]"
)


def strip_emoji(text: str) -> str:
    """去掉 emoji、变体选择符、ZWJ、肤色与区域指示符（保留 → · — 等排版符号）。"""
    return _EMOJI_RE.sub("", text)
