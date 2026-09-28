"""批量为索引层/缺口项目搜 Wikimedia Commons 配图（自由许可，best effort）。

词源优先级：
1. DEEP_TERMS：深读档案里缺图的固定英文词（台湾批次）；
2. index_enrich.json 的 img_terms（升级脚本产出，随升级进度增多）；
3. 都没有 → 本次跳过（下次续跑时新 img_terms 自动纳入）。

流程（幂等）：
- 已有 <id>.jpg → done；
- img_state.json 记录 status(done/miss) 与已试词；miss 的条目只有出现新词才重试；
- 搜图过滤：filemime 图片、宽 ≥640、排除 logo/map/flag 等站内装饰图；
- 下载 → sips 转 jpeg 宽 900 → frontend/public/images/heritage/<id>.jpg；
- 追加 credits.json：{license, term, title}（About 页与知识库详情页消费）。

用法：backend/.venv/bin/python scripts/fetch_images_bulk.py [--limit N]
"""

import json
import pathlib
import re
import ssl
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "frontend" / "public" / "images" / "heritage"
ENRICH = ROOT / "data" / "structured" / "index_enrich.json"
ITEMS = ROOT / "data" / "structured" / "heritage_items.json"
STATE = ROOT / "data" / "structured" / "img_state.json"
PROXY = "http://127.0.0.1:7890"
API = "https://commons.wikimedia.org/w/api.php"

_local = threading.local()
_lock = threading.Lock()


def opener():
    op = getattr(_local, "opener", None)
    if op is None:
        op = urllib.request.build_opener(
            urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}),
            urllib.request.HTTPSHandler(context=ssl.create_default_context()),
        )
        op.addheaders = [("User-Agent", "chengmai-ai/1.0 (competition project; contact: zzh705)")]
        _local.opener = op
    return op

# 深读缺图项（台湾批次）的英文搜图词
DEEP_TERMS = {
    "h_tw_budaixi": ["Taiwan glove puppetry", "Budaixi puppet"],
    "h_tw_gezaxi": ["Gezaixi Taiwanese opera", "Taiwan opera performance", "歌仔戲"],
    "h_tw_fengnianji": ["Amis festival Taiwan", "Taiwan indigenous dance festival"],
    "h_tw_zhibu": ["Atayal weaving Taiwan", "Taiwan indigenous weaving loom"],
    "h_tw_luoxiyan": ["Taiwan inkstone", "Chinese inkstone carving", "Taiwan craftsman workshop"],
    "h_tw_meinong_yuzhisan": ["Meinong oil paper umbrella", "Taiwan paper umbrella"],
}

# Commons 站内装饰图/非照片：命中即弃
BAD_PAT = re.compile(
    r"logo|coat of arms|\bflag\b|\bseal\b|\bmap\b|icon\b|banner|"
    r"diagram|chart\b|screenshot|poster|scan of|\bsymbol\b|"
    # 书影/论文/期刊扫描：有题无图
    r"考釋|釋文|論文|學位|學報|期刊|全集|字典|辭典|年鑑|彙編|"
    r"\bISBN\b|\bvolume\b|\bmanuscript\b",
    re.I,
)


def search(term: str) -> dict | None:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"{term} filemime:image/jpeg",
            "gsrnamespace": 6,
            "gsrlimit": 12,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata|size",
            "iiurlwidth": 1400,
            "format": "json",
        }
    )
    with opener().open(f"{API}?{q}", timeout=30) as r:
        data = json.loads(r.read().decode())
    pages = data.get("query", {}).get("pages", {})
    ordered = sorted(pages.values(), key=lambda p: p.get("index", 99))
    tokens = [w.lower() for w in re.findall(r"[A-Za-z]{4,}", term)]
    fallback = None
    for p in ordered:
        title = p.get("title", "")
        if BAD_PAT.search(title):
            continue
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        if not url or not url.lower().split("?")[0].endswith((".jpg", ".jpeg")):
            continue
        if (info.get("width") or 0) < 640:
            continue
        meta = info.get("extmetadata", {})
        hit = {
            "url": url,
            "license": meta.get("LicenseShortName", {}).get("value", "see source"),
            "title": title,
        }
        # 一级：标题含搜索词实词（防 OR 检索捞到异物）；无命中时退到过了基础过滤的首候选
        if not tokens or any(t in title.lower() for t in tokens):
            return hit
        if fallback is None:
            fallback = hit
    return fallback


def fetch(item_id: str, term: str) -> bool:
    hit = search(term)
    if not hit:
        print(f"  {item_id}: 未命中 ← {term}", flush=True)
        return False
    tmp = IMG_DIR / f"_tmp_{item_id}"
    with opener().open(hit["url"], timeout=60) as r:
        tmp.write_bytes(r.read())
    out = IMG_DIR / f"{item_id}.jpg"
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "900", str(tmp), "--out", str(out)],
        check=True,
        capture_output=True,
    )
    tmp.unlink(missing_ok=True)
    credits_path = IMG_DIR / "credits.json"
    with _lock:
        credits = json.loads(credits_path.read_text(encoding="utf-8"))
        credits[item_id] = {"license": hit["license"], "term": term, "title": hit["title"]}
        credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  {item_id}: {out.stat().st_size // 1024}KB ← {hit['title'][:52]} [{hit['license']}]", flush=True)
    return True


def terms_for(item: dict, enrich: dict) -> list[str]:
    """该项目本次可尝试的搜索词（英文词在前，中文名兜底仅在有英文词时附上）。"""
    if item.get("tier") != "index":
        return DEEP_TERMS.get(item["id"], [item["name"]])
    got = (enrich.get(item["id"]) or {}).get("img_terms") or []
    if isinstance(got, str):
        got = [got]
    return [t for t in got if isinstance(t, str) and t.strip()][:3]


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    enrich = json.loads(ENRICH.read_text(encoding="utf-8")) if ENRICH.exists() else {}
    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}

    todo = []
    skipped = 0
    for item in items:
        iid = item["id"]
        if (IMG_DIR / f"{iid}.jpg").exists():
            state[iid] = {"status": "done"}
            continue
        terms = terms_for(item, enrich)
        if not terms:
            continue  # 还没有英文词：等升级产出后续跑
        prev = state.get(iid) or {}
        new_terms = [t for t in terms if t not in (prev.get("tried") or [])]
        if prev.get("status") == "miss" and not new_terms:
            skipped += 1
            continue
        todo.append((item, terms, prev))
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")
    if limit is not None:
        todo = todo[:limit]
    print(f"待抓取 {len(todo)} 项（已跳过历史无果 {skipped}）", flush=True)

    stats = {"done": 0, "miss": 0}

    def work(job):
        item, terms, prev = job
        iid = item["id"]
        ok = False
        for t in terms:
            try:
                if fetch(iid, t):
                    ok = True
                    break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    time.sleep(8)
                    continue
                print(f"  {iid}: HTTP {e.code}", flush=True)
                break
            except Exception as e:  # noqa: BLE001
                print(f"  {iid}: {type(e).__name__}: {e}", flush=True)
                break
            time.sleep(0.7)
        with _lock:
            state[iid] = {"status": "done" if ok else "miss", "tried": sorted(set((prev.get("tried") or []) + terms))}
            STATE.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")
            stats["done" if ok else "miss"] += 1
            n = stats["done"] + stats["miss"]
        if n % 20 == 0:
            print(f"[{n}/{len(todo)}] 新增 {stats['done']} 张", flush=True)
        time.sleep(0.4)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(work, j) for j in todo]
        for f in as_completed(futs):
            f.result()

    print(f"完成：新增 {stats['done']} 张，本轮无果 {stats['miss']}，跳过历史无果 {skipped}", flush=True)


if __name__ == "__main__":
    main()
