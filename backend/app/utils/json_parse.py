"""从 LLM 输出中稳健提取 JSON（Agent 工程常用工具）。"""

import json
import re


def extract_json(text: str) -> dict:
    """容忍 ```json 代码块/多余文字包裹，提取第一个 JSON 对象并解析。"""
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("模型未返回有效 JSON")
    return json.loads(match.group(0))
