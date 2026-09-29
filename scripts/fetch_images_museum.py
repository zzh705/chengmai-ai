"""残项补图：大都会博物馆 + 克利夫兰艺术博物馆（均为 CC0/公有领域开放 API）。

面向 Commons/Openverse 仍缺的条目（多为器物类非遗：绣品、陶瓷、乐器、面具）。
复用 fetch_images_v3 的下载/评分/限速设施；独立断点 img_state_museum.json。

用法: python3 scripts/fetch_images_museum.py [--limit N]
"""

import json
import pathlib
import sys
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_images_v3 import (  # noqa: E402
    ITEMS,
    TERMS2,
    ENRICH,
    IMG_DIR,
    BAD_PAT,
    _get,
    cjk_shingles,
    download,
    latin_tokens,
    terms_for,
)

STATE = ROOT / "data" / "structured" / "img_state_museum.json"
MET_SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects"
CLE_API = "https://openaccess-api.clevelandart.org/api/artworks/"

# 通用词（材料/工序/器型/朝代名）不足以证明相关：必须命中至少一个「非通用」词源，
# 否则 Met/Cleveland 的材质字段（silver/wood/bronze…）会把罗马胸像放进来，
# 拼音同形词（song/yuan/ming/qing/tang）会与 Song/Ming dynasty 等撞车（均实测踩坑）。
GENERIC = set(
    """
    silver gold gilt copper iron bronze brass jade wood wooden stone marble silk cloth
    cotton linen wool leather paper ivory amber pearl shell bone horn lead zinc pewter
    tin glass porcelain ceramic clay chalk agate crystal steel hammer forged forging weld
    brazed solder carved carving engraved casting cast mold mould painted painting drawn
    stitched knitting woven weaving polished ground cutting tool craft crafts workshop
    museum studio period century dynasty style school figure object piece part set pair
    design decorated decoration pattern frame panel bowl cup vessel pot jar box mask doll
    game bell coin knife blade vessel made making work works production
    tang song yuan ming qing zhou shang feng
    hand scroll handscroll landscape portrait biography calligraphy paper ink
    night white great long small new year ancient coloring performance
    imperial palace tomb emperor court reign era donor literati northern southern
    """.split()
)

# 技法词不足以证明「是这一项」：Met 全品类都有 repoussé/chasing/casting……
TECHNIQUE = set(
    """
    repouss chasing coiling winding soldering solder inlaying inlay engraving engraved
    engrave hammering hammered beating cast casting mold mould polishing polish grinding
    grind cutting stitch stitching weaving woven knitting filigree gilding gilded
    chasing chased punching embossing repousse chasing chasing chasing chasing
    mandrel chased chasing chasing
    """.split()
)

# 东亚文化门：仅中/藏/蒙/维吾尔/满等前缀——日韩器物常混入（乌铜走银配到日本印笼、
# 老河口年画配到日本版画，均实测踩坑），一律挡掉。
EA = ("chin", "tibe", "mong", "uygh", "uigh", "manch", "bai", "miao", "hua")


def _words(s: str) -> set[str]:
    return set(w for w in __import__("re").findall(r"[a-z]{4,}", s.lower()))


def museum_score(composite: str, full_term: str, extra: list[str], name_sh: tuple) -> float:
    """中文标题切片 ≥1，或（东亚文化门 + 非技法内容词命中 ≥1）。"""
    if BAD_PAT.search(composite):
        return 0
    if any(s and s in composite for s in name_sh):
        return 10
    W = _words(composite)
    if not any(w.startswith(p) for p in EA for w in W):
        return 0

    def hit(tok: str) -> bool:
        if len(tok) < 4:
            return tok in W
        return any(w == tok or w[:4] == tok[:4] for w in W)

    full_lat = latin_tokens(full_term)
    content = [t for t in full_lat if t not in GENERIC and t not in TECHNIQUE]
    hits = [t for t in content if hit(t)]
    if not hits:
        return 0
    return 5 + len(hits)

_lock = threading.Lock()


def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"items": {}}


def save_state(st: dict) -> None:
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(STATE)


def met_hits(term: str, full_term: str, extra: list[str], name_sh: tuple) -> list[dict]:
    import urllib.parse

    q = urllib.parse.urlencode({"q": term, "hasImages": "true", "isPublicDomain": "true"})
    try:
        data = json.loads(_get(f"{MET_SEARCH}?{q}").decode())
    except Exception as e:  # noqa: BLE001
        print(f"    met-search {type(e).__name__} {getattr(e, 'code', '')}", flush=True)
        return []
    ids = (data.get("objectIDs") or [])[:10]
    out = []
    for oid in ids:
        time.sleep(0.15)
        try:
            obj = json.loads(_get(f"{MET_OBJECT}/{oid}").decode())
        except Exception:  # noqa: BLE001
            continue
        img = obj.get("primaryImage") or ""
        if not img.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png")):
            continue
        composite = " ".join(
            str(obj.get(k) or "")
            for k in ("title", "objectName", "culture", "period", "medium", "department", "classification")
        )
        sc = museum_score(composite, full_term, extra, name_sh)
        if sc <= 0:
            continue
        out.append(
            {
                "url": img,
                "license": "CC0",
                "title": f"{obj.get('title', '')} · {obj.get('objectName', '')}".strip(" ·"),
                "source": "met",
                "landing": obj.get("objectURL", ""),
                "score": sc,
            }
        )
    out.sort(key=lambda x: -x["score"])
    return out


def cleveland_hits(term: str, full_term: str, extra: list[str], name_sh: tuple) -> list[dict]:
    import urllib.parse

    q = urllib.parse.urlencode({"q": term, "has_image": 1, "cc0": 1, "limit": 15})
    try:
        data = json.loads(_get(f"{CLE_API}?{q}").decode())
    except Exception as e:  # noqa: BLE001
        print(f"    cle-search {type(e).__name__} {getattr(e, 'code', '')}", flush=True)
        return []
    out = []
    for r0 in data.get("data", [])[:15]:
        imgs = r0.get("images") or {}
        url = ((imgs.get("web") or {}).get("url")) or ((imgs.get("print") or {}).get("url")) or ""
        if not url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png")):
            continue
        composite = " ".join(
            str(r0.get(k) or "")
            for k in ("title", "culture", "technique", "type", "department")
        )
        sc = museum_score(composite, full_term, extra, name_sh)
        if sc <= 0:
            continue
        out.append(
            {
                "url": url,
                "license": "CC0",
                "title": str(r0.get("title") or ""),
                "source": "cleveland",
                "landing": r0.get("url", "") or "",
                "score": sc,
            }
        )
    out.sort(key=lambda x: -x["score"])
    return out


def work(item: dict, terms: list[str], stats: dict) -> None:
    iid = item["id"]
    extra: list[str] = []
    for t in terms:
        for tok in latin_tokens(t):
            if tok not in extra:
                extra.append(tok)
    name_sh = tuple(cjk_shingles(item.get("name") or ""))
    for t in terms[:7]:
        for source in (met_hits, cleveland_hits):
            try:
                hits = source(t, t, extra, name_sh)
            except Exception as e:  # noqa: BLE001
                print(f"  {iid}: {source.__name__} {type(e).__name__}", flush=True)
                continue
            for hit in hits:
                try:
                    if download(iid, hit, t):
                        with _lock:
                            st = load_state()
                            st["items"][iid] = "done"
                            save_state(st)
                        stats["done"] += 1
                        print(f"  {iid}: ← [{hit['source']}] {hit['title'][:56]} [CC0]", flush=True)
                        return
                except Exception as e:  # noqa: BLE001
                    print(f"  {iid}: dl {type(e).__name__}: {e}", flush=True)
                    break
            time.sleep(0.3)
    with _lock:
        st = load_state()
        st["items"][iid] = "miss"
        save_state(st)
    stats["miss"] += 1


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    enrich = json.loads(ENRICH.read_text(encoding="utf-8")) if ENRICH.exists() else {}
    terms2 = json.loads(TERMS2.read_text(encoding="utf-8")) if TERMS2.exists() else {}
    todo = [i for i in items if not (IMG_DIR / f"{i['id']}.jpg").exists()]
    jobs = [(i, terms_for(i, terms2, enrich)) for i in todo]
    jobs = [j for j in jobs if j[1]]
    if limit is not None:
        jobs = jobs[:limit]
    print(f"博物馆补图待抓 {len(jobs)} 项", flush=True)
    stats = {"done": 0, "miss": 0}
    from concurrent.futures import ThreadPoolExecutor, as_completed

    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(work, i, t, stats) for i, t in jobs]
        for n, f in enumerate(as_completed(futs), 1):
            f.result()
            if n % 30 == 0:
                print(f"[{n}/{len(jobs)}] 博物馆新增 {stats['done']} 缺 {stats['miss']}", flush=True)
    print(f"完成：新增 {stats['done']}，仍缺 {stats['miss']}", flush=True)


if __name__ == "__main__":
    main()
