"""深读项目字段扩写：把简介/文化内涵/技艺工序过短的条目用 LLM 补到与全库一致的水位。

用法（须在 backend/ 目录下运行）：
    .venv/bin/python scripts/expand_deep_fields.py          # 实际写回
    .venv/bin/python scripts/expand_deep_fields.py --dry    # 只打印不写回
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/structured/heritage_items.json"

sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from app.services.llm import chat as llm_chat  # noqa: E402
from app.utils.json_parse import extract_json  # noqa: E402

FIELDS = ["description", "cultural_meaning", "craft_process"]
# 目标水位：与全库中位数（desc≈300/cult≈250/craft≈240）对齐
TARGETS = {"description": (280, 340), "cultural_meaning": (240, 300), "craft_process": (240, 300)}
LABELS = {"description": "项目简介", "cultural_meaning": "文化内涵", "craft_process": "技艺工序"}


def needs_expand(item: dict) -> bool:
    return (
        len(item.get("description") or "") < 200
        or len(item.get("cultural_meaning") or "") < 180
        or len(item.get("craft_process") or "") < 180
    )


def build_prompt(it: dict) -> str:
    base = "\n".join(f"{LABELS[f]}（现有）：{it.get(f) or '（空缺）'}" for f in FIELDS)
    extra = ""
    if it.get("fun_facts"):
        extra += "\n冷知识素材：" + "；".join(it["fun_facts"][:3])
    if it.get("hook"):
        extra += f"\n记忆钩子：{it['hook']}"
    return (
        f"你是非遗档案撰写人。请为非遗项目「{it['name']}」（{it['category']}，{it['region']}，{it.get('era', '')}）"
        "扩写三个档案字段，要求：\n"
        "1. 以现有内容为事实基础扩写，不得虚构具体人名、年代、数字；\n"
        "2. 风格与全库一致：准确、有据、面向青年读者通俗易懂，有画面感但不浮夸；\n"
        f"3. 各字段字数：项目简介 280-340 字，文化内涵 240-300 字，技艺工序 240-300 字"
        "（若该项目是节庆/表演类，'技艺工序'字段撰写其仪式流程或表演程式）；\n"
        "4. 只输出 JSON，格式："
        '{"description": "...", "cultural_meaning": "...", "craft_process": "..."}，'
        "禁止 emoji 与装饰符号。\n\n"
        f"{base}{extra}"
    )


def main() -> None:
    dry = "--dry" in sys.argv
    items = json.loads(DATA.read_text(encoding="utf-8"))
    targets = [it for it in items if it.get("tier") != "index" and needs_expand(it)]
    print(f"待扩写 {len(targets)} 项：{[t['name'] for t in targets]}")
    if not targets:
        return

    for it in targets:
        print(f"\n== {it['name']} ==")
        data = None
        for attempt in range(2):
            try:
                data = extract_json(
                    llm_chat(build_prompt(it), temperature=0.6, timeout=60.0, max_retries=1)
                )
                break
            except Exception as e:  # noqa: BLE001
                print(f"  第 {attempt + 1} 次生成失败：{e}")
        if not data:
            print("  跳过（两次均失败）")
            continue
        for f in FIELDS:
            text = (data.get(f) or "").strip()
            old = len(it.get(f) or "")
            # 验收：明显长于原文且不低于 220 字即采纳（区间下限只作生成引导）
            if len(text) >= 220 and len(text) > old + 40:
                it[f] = text
                print(f"  {LABELS[f]}: {old} -> {len(text)} 字")
            else:
                print(f"  {LABELS[f]}: 生成 {len(text)} 字不达标，保留原文 {old} 字")

    if dry:
        print("\n[dry-run] 不写回文件")
        return
    shutil.copy(DATA, DATA.with_suffix(".json.bak"))
    DATA.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n已写回 {DATA}（备份 {DATA.name}.bak）")


if __name__ == "__main__":
    main()
