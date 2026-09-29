#!/usr/bin/env python3
"""本地匹配类目池：倒排索引候选 → score_title（类目名并入有效标题做地域背书）
→ download。零 Commons 搜索请求（仅图片下载）。

用法：backend/.venv/bin/python -u scripts/match_pool.py [--limit N]
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_images_v3 import (  # noqa: E402
    ITEMS,
    TERMS2,
    ENRICH,
    IMG_DIR,
    BAD_PAT,
    cjk_shingles,
    download,
    latin_tokens,
    mark_done,
    score_title,
    terms_for,
    CJK_RE,
)

POOL = ROOT / "data/structured/commons_pool.jsonl"
WORD = re.compile(r"[A-Za-z]{4,}")


def load_pool() -> tuple[list[dict], dict[str, list[int]]]:
    seen: set[str] = set()
    pool: list[dict] = []
    inv: dict[str, list[int]] = defaultdict(list)
    for line in POOL.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
        except Exception:  # noqa: BLE001
            continue
        if r["title"] in seen:
            continue
        seen.add(r["title"])
        idx = len(pool)
        pool.append(r)
        tl = r["title"].lower()
        for w in set(WORD.findall(tl)):
            inv[w].append(idx)
        # 中文标题按 2-gram 入倒排
        if CJK_RE.search(r["title"]):
            chars = [c for c in r["title"] if CJK_RE.match(c)]
            for i in range(len(chars) - 1):
                inv["#" + "".join(chars[i : i + 2])].append(idx)
    return pool, inv


def candidates_for(pool, inv, term: str, extra: list[str]) -> list[int]:
    keys: set[str] = set()
    if CJK_RE.search(term):
        chars = [c for c in term if CJK_RE.match(c)]
        for i in range(max(len(chars) - 1, 1)):
            keys.add("#" + "".join(chars[i : i + 2]))
        # 单字也查（短词如“川剧”）
        for c in chars:
            keys.add("#" + c)
    else:
        keys.update(w for w in latin_tokens(term) if len(w) >= 4)
    out: set[int] = set()
    for k in keys:
        out.update(inv.get(k, ()))
    return sorted(out)


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    pool, inv = load_pool()
    print(f"池 {len(pool)} 图，倒排键 {len(inv)}", flush=True)
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    terms2 = json.loads(TERMS2.read_text(encoding="utf-8"))
    enrich = json.loads(ENRICH.read_text(encoding="utf-8"))
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    # 已被其他条目占用的 URL 不复用（v3 state + 本进程已下载）
    from fetch_images_v3 import load_state

    used_urls: set[str] = set(load_state().get("urls", {}).keys())
    cr_path = IMG_DIR / "credits.json"
    todo = [
        i
        for i in items
        if not (IMG_DIR / f"{i['id']}.jpg").exists() and (terms2.get(i["id"]) or enrich.get(i["id"]))
    ]
    if limit:
        todo = todo[:limit]
    print(f"待本地匹配 {len(todo)} 项", flush=True)
    done = miss = 0
    for n, it in enumerate(todo, 1):
        iid = it["id"]
        ts = terms_for(it, terms2, enrich)
        extra: list[str] = []
        for t in ts:
            for tok in latin_tokens(t):
                if tok not in extra:
                    extra.append(tok)
        name_sh = tuple(cjk_shingles(it.get("name") or ""))
        cands: set[int] = set()
        for t in ts:
            cands.update(candidates_for(pool, inv, t, extra))
        best = None
        for idx in cands:
            r = pool[idx]
            if r["url"] in used_urls:
                continue
            eff = f"{r['title']} | {r['cat']}"
            if BAD_PAT.search(eff):
                continue
            # 逐词打分取最优
            for t in ts:
                s = score_title(eff, t, extra, name_sh)
                if s > 0 and (best is None or s > best[0]):
                    best = (s, r, t)
                if s >= 10:
                    break
            if best and best[0] >= 10:
                break
        if best:
            _, rec, t = best
            try:
                if download(iid, {"url": rec["url"], "license": rec["lic"], "title": rec["title"], "source": "commons-pool", "landing": rec["landing"]}, t):
                    cr = json.loads(cr_path.read_text(encoding="utf-8"))
                    cr[iid] = {"license": rec["lic"], "term": t, "title": rec["title"], "source": "commons-pool", "landing": rec["landing"], "cat": rec["cat"]}
                    cr_path.write_text(json.dumps(cr, ensure_ascii=False, indent=1), encoding="utf-8")
                    mark_done(iid, rec["url"])
                    used_urls.add(rec["url"])
                    done += 1
                    print(f"  {iid}: ← [pool] {rec['title'][:56]}", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"  {iid}: dl {type(e).__name__}: {e}", flush=True)
        else:
            miss += 1
        if n % 100 == 0:
            print(f"[{n}/{len(todo)}] 池匹配 {done} 未中 {miss}", flush=True)
    print(f"完成：池匹配 {done}，未中 {miss}", flush=True)


if __name__ == "__main__":
    main()
