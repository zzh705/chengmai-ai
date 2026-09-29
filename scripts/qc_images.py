#!/usr/bin/env python3
"""终审 QC：LLM 对照「非遗条目名 ↔ 图片文件标题」批量审可疑配图。

用法：
  backend/.venv/bin/python -u scripts/qc_images.py            # 只审不删
  backend/.venv/bin/python -u scripts/qc_images.py --delete   # 删 bad（jpg+credits+state）
  backend/.venv/bin/python -u scripts/qc_images.py --only-new # 只审 credits 带 term 的
"""
from __future__ import annotations

import json
import os
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

ENV = ROOT / "backend/.env"
if ENV.exists():
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

from openai import OpenAI  # noqa: E402

IMG = ROOT / "frontend/public/images/heritage"
BATCH = 40

SYSTEM = (
    "你是严谨的图片审核员。给定中国国家级非遗项目名与已配图片的文件标题，"
    "判断图片标题是否与项目明显不符：异国无关事物、无关地标建筑、纯文字图表、"
    "明显撞名（如人名/品牌与项目拼音相同）、类别完全不对（给刺绣配了碗碟、"
    "给故事配了别国政治人物）。同为中国文化圈的民俗/人物/场景照片算合格。"
    "宁可少报，只报确定不符的。"
)


def main() -> None:
    delete = "--delete" in sys.argv
    only_new = "--only-new" in sys.argv
    items = {i["id"]: i for i in json.loads((ROOT / "data/structured/heritage_items.json").read_text(encoding="utf-8"))}
    cr_path = IMG / "credits.json"
    cr = json.loads(cr_path.read_text(encoding="utf-8"))
    st_path = ROOT / "data/structured/img_state_v3.json"
    st = json.loads(st_path.read_text(encoding="utf-8")) if st_path.exists() else {"items": {}}

    rows = []
    for iid, v in cr.items():
        if iid not in items:
            continue
        if only_new and not (v or {}).get("term"):
            continue
        rows.append((iid, items[iid]["name"], (v or {}).get("title") or ""))
    print(f"待审 {len(rows)} 张", flush=True)

    client = OpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
    )
    model = os.getenv("LLM_MODEL", "qwen-plus")
    bad: dict[str, str] = {}
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        lines = [f"{iid} | 项目：{name} | 图片标题：{title}" for iid, name, title in chunk]
        user = "\n".join(lines) + "\n\n只输出 JSON 数组：[{\"id\":\"...\",\"why\":\"...\"}]，列出所有确定不符的 id；没有则输出 []。"
        try:
            r = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
                temperature=0,
                timeout=60,
            )
            txt = r.choices[0].message.content or "[]"
            s, e = txt.find("["), txt.rfind("]")
            arr = json.loads(txt[s : e + 1]) if s >= 0 and e > s else []
            for it in arr:
                if it.get("id") in items:
                    bad[it["id"]] = str(it.get("why", ""))[:80]
        except Exception as e:  # noqa: BLE001
            print(f"  batch {i // BATCH}: {type(e).__name__}: {e}", flush=True)
        print(f"[{min(i + BATCH, len(rows))}/{len(rows)}] 已标 bad {len(bad)}", flush=True)

    print(f"\n判定不符 {len(bad)} 张：", flush=True)
    for iid, why in bad.items():
        print(f"  ✗ {iid} {items[iid]['name'][:20]} — {why}", flush=True)

    if delete and bad:
        for iid in bad:
            (IMG / f"{iid}.jpg").unlink(missing_ok=True)
            cr.pop(iid, None)
            st.get("items", {}).pop(iid, None)
        cr_path.write_text(json.dumps(cr, ensure_ascii=False, indent=1), encoding="utf-8")
        st_path.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"已删除，credits 余 {len(cr)}", flush=True)


if __name__ == "__main__":
    main()
