#!/usr/bin/env python3
"""按 LLM 生成的 Commons 分类批量拉取成员（gcm 分页），存紧凑记录到
data/structured/commons_pool.jsonl。共享 fetch_images_v3 的 _get（限速/冷却/缓存）。

用法：backend/.venv/bin/python -u scripts/fetch_pool.py [--pages N]
"""
from __future__ import annotations

import json
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_images_v3 import _get, OK_EXT  # noqa: E402

CATS_FILES = sorted(ROOT.glob("data/structured/commons_categories*.json"))
POOL = ROOT / "data/structured/commons_pool.jsonl"
API = "https://commons.wikimedia.org/w/api.php"
MAX_PAGES = int(sys.argv[sys.argv.index("--pages") + 1]) if "--pages" in sys.argv else 8


def build(cat: str, cont: dict | None) -> str:
    params: dict = {
        "action": "query",
        "generator": "categorymembers",
        "gcmtitle": f"Category:{cat}",
        "gcmtype": "file",
        "gcmlimit": "500",
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size",
        "iiurlwidth": "1400",
        "format": "json",
    }
    if cont:
        # MediaWiki 续传令牌是通用字典（gcmcontinue/iicontinue/continue 混合），
        # 只认 gcmcontinue 会漏掉 imageinfo 续传 → 每类只取到首批 ~50 条
        params.update(cont)
    return f"{API}?{urllib.parse.urlencode(params)}"


def extract(cat: str, data: dict) -> list[dict]:
    out = []
    for p in (data.get("query", {}).get("pages", {}) or {}).values():
        title = p.get("title", "")
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        if not url or not url.lower().split("?")[0].endswith(OK_EXT):
            continue
        if (info.get("width") or 0) < 640:
            continue
        meta = info.get("extmetadata", {})
        out.append(
            {
                "cat": cat,
                "title": title,
                "url": url,
                "landing": info.get("descriptionurl", ""),
                "w": info.get("width") or 0,
                "h": info.get("height") or 0,
                "lic": meta.get("LicenseShortName", {}).get("value", "see source"),
            }
        )
    return out


def main() -> None:
    cats: list[str] = []
    for f in CATS_FILES:
        cats.extend(json.loads(f.read_text(encoding="utf-8")))
    cats = list(dict.fromkeys(cats))
    have: set[str] = set()
    if POOL.exists():
        for line in POOL.read_text(encoding="utf-8").splitlines():
            try:
                have.add(json.loads(line)["cat"])
            except Exception:  # noqa: BLE001
                continue
    todo = [c for c in cats if c not in have]
    print(f"类目 {len(cats)}，已有池 {len(have)}，本轮拉取 {todo and len(todo)}（每类≤{MAX_PAGES}页）", flush=True)
    added = 0
    with POOL.open("a", encoding="utf-8") as f:
        for n, cat in enumerate(todo, 1):
            cont: dict | None = None
            got: list[dict] = []
            for _ in range(MAX_PAGES):
                try:
                    data = json.loads(_get(build(cat, cont)).decode())
                except Exception as e:  # noqa: BLE001
                    print(f"  {cat}: {type(e).__name__} {getattr(e, 'code', '')}", flush=True)
                    break
                got.extend(extract(cat, data))
                cont = data.get("continue")
                if not cont or len(got) >= 1500:
                    break
            for rec in got:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            added += len(got)
            f.flush()
            if n % 20 == 0 or n == len(todo):
                print(f"[{n}/{len(todo)}] 累计入池 {added}", flush=True)
    print(f"完成：本轮新增 {added}，池文件 {POOL}", flush=True)


if __name__ == "__main__":
    main()
