#!/usr/bin/env python3
"""用定稿后的评分器复审已下载图片：不合格者删除（jpg+credits+state），回池重抓。

用法：backend/.venv/bin/python -u scripts/rescore_images.py [--dry]
"""
from __future__ import annotations

import json
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_images_v3 import (  # noqa: E402
    ITEMS,
    TERMS2,
    ENRICH,
    cjk_shingles,
    score_title,
    terms_for,
)

IMG = ROOT / "frontend/public/images/heritage"


def main() -> None:
    dry = "--dry" in sys.argv
    items = {i["id"]: i for i in json.loads(ITEMS.read_text(encoding="utf-8"))}
    terms2 = json.loads(TERMS2.read_text(encoding="utf-8"))
    enrich = json.loads(ENRICH.read_text(encoding="utf-8"))
    cr_path = IMG / "credits.json"
    cr = json.loads(cr_path.read_text(encoding="utf-8"))
    st_path = ROOT / "data/structured/img_state_v3.json"
    st = json.loads(st_path.read_text(encoding="utf-8"))

    bad = []
    checked = 0
    for iid, v in list(cr.items()):
        term = (v or {}).get("term")
        title = (v or {}).get("title")
        if not term or not title or iid not in items:
            continue
        checked += 1
        it = items[iid]
        name_sh = tuple(cjk_shingles(it["name"]))
        sc = score_title(title, term, [], name_sh)
        if sc <= 0:
            bad.append((iid, title[:56], term[:44]))

    print(f"复审 {checked} 条（含 term 的 v3 产物），不合格 {len(bad)}")
    for iid, title, term in bad:
        print(f"  ✗ {iid}: {title}  ← {term}")
        if dry:
            continue
        (IMG / f"{iid}.jpg").unlink(missing_ok=True)
        cr.pop(iid, None)
        st.get("items", {}).pop(iid, None)

    if not dry:
        cr_path.write_text(json.dumps(cr, ensure_ascii=False, indent=1), encoding="utf-8")
        st_path.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"已清理，credits 余 {len(cr)}")


if __name__ == "__main__":
    main()
