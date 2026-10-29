# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：Agent 工程工具：从 LLM 自由文本中稳健提取 JSON（去围栏、容错截断）
# ============================================================
"""从 LLM 输出中稳健提取 JSON（Agent 工程常用工具）。"""

import json
import re

from app.utils.text_clean import strip_emoji


def extract_json(text: str) -> dict:
    """容忍 ```json 代码块/多余文字包裹，提取第一个 JSON 对象并解析。"""
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("模型未返回有效 JSON")
    return json.loads(strip_emoji(match.group(0)))
