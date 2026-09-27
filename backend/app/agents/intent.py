"""意图识别（总文档 11.1）：第一版用关键词规则，Phase 2 升级为 LLM 判别。"""

INTENT_LABELS = {
    "LEARNING": "学习",
    "QUIZ": "测验",
    "STORY": "故事",
    "CREATION": "创作/活化",
    "COMPARE": "对比",
    "INFO": "知识问答",
}

_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("LEARNING", ("学习", "了解", "入门", "路线", "几天", "分钟", "课程", "怎么学", "带我")),
    ("QUIZ", ("测验", "测试题", "考考", "出题", "选择题", "判断题", "问答题")),
    ("STORY", ("故事", "讲给", "讲一个", "介绍成", "脚本", "视频")),
    ("CREATION", ("创意", "活化", "结合", "文创", "活动方案", "策划", "设计一个", "宣传")),
    ("COMPARE", ("区别", "对比", "哪个", "异同", "还是")),
]


def detect_intent(text: str) -> str:
    """根据用户输入返回意图标签，未命中规则时返回 INFO。"""
    for intent, keywords in _RULES:
        if any(k in text for k in keywords):
            return intent
    return "INFO"
