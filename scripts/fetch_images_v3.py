"""全量补齐实拍图（目标 100%）：Commons 主力 + Openverse 尾部（预算制）+ 复用二轮。

词源：enrich_img_terms 的 8 词/项（不足时回退 enrich img_terms / 中文名）。
- 查询降级：长词组 → 前缀/后缀缩短（CirrusSearch 全词 AND，长句必空）；
- 命中评分：标题须命中全词 token（≥1）或中文双字切片；CJK 词查英文标题需
  命中本项全部词源 ≥2 个 token，防串图；
- HTTPError 退避重试（代理并发偶发 5xx）；
- pass1 Commons 逐词（跨条目 URL 去重）；pass2 Openverse（200/天预算）；
  pass3 允许复用 URL 兜底。

落盘：<id>.jpg（sips 转 jpeg 900px，<15KB 废图丢弃）+ credits.json
{license, term, title, source: commons|openverse, landing}。

用法: python3 scripts/fetch_images_v3.py [--limit N] [--no-openverse] [--no-reuse]
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
ITEMS = ROOT / "data" / "structured" / "heritage_items.json"
ENRICH = ROOT / "data" / "structured" / "index_enrich.json"
TERMS2 = ROOT / "data" / "structured" / "img_terms_v2.json"
STATE = ROOT / "data" / "structured" / "img_state_v3.json"
CREDITS = IMG_DIR / "credits.json"
PROXY = "http://127.0.0.1:7890"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
OPENVERSE_API = "https://api.openverse.org/v1/images/"
OV_BUDGET_MIN = 12

_local = threading.local()
_lock = threading.Lock()

BAD_PAT = re.compile(
    r"logo|coat of arms|\bflag\b|\bseal\b|\bmap of\b|icon\b|banner|"
    r"diagram|chart\b|screenshot|scan of|\bsymbol\b|"
    r"地图|位置图|分布图|行政区|政区|示意图|路线图|人口|区划|卫星图|"
    r"\btower\b|\bpagoda\b|\btemple\b|\bmonastery\b|\bpalace\b|\bmuseum\b|\bbridge\b|"
    r"\bshrine\b|\bchurch\b|\bcastle\b|\bbuilding\b|\blandmark\b|\bsite\b|"
    r"考釋|釋文|論文|學位|學報|期刊|全集|字典|辭典|年鑑|彙編|"
    r"\bISBN\b|\bvolume\b|\bmanuscript\b|"
    r"postage stamp|\bstamp\b|philatelic|banknote|bank note|\bcoin\b|power plant|substation|"
    r"\bstation\b|\bairport\b|terminal|school\b|university|hospital\b|hotel\b",
    re.I,
)
OK_EXT = (".jpg", ".jpeg", ".png", ".webp")
STOP = {"the", "and", "with", "from", "into", "over", "under", "this", "that", "for"}
CJK_RE = re.compile(r"[一-鿿]")

# 叙事/表演类词：story/tale/epic/performance… 能命中全世界任何一张图
# （实测踩坑：徐文长故事→Drag Story、都镇湾故事→英国首相讲故事、嘎达梅林→塞尔维亚说唱）。
# 单独命中不算数，必须再有中国地域信号。
NARR = set(
    """
    story stories storytelling tale tales myths myth mythic legend legends epic epics
    performance performing performances recitation recite singing singer song songs
    sung chant chanting duet ballad drama dramatic theatrical theatre plays play
    puppet puppetry marionette illustration illustrated folklore folk skit skits
    pageant opera festival ceremony rituals ritual dance dances dancing music musical
    songs sung scene scenes show shows workshop demonstration craftsmanship artisan
    sculpture statue portrait mural carving cham
    """.split()
)

# 材料/器型/朝代拼音/书画套路词：同样不足以独证相关（与 museum GENERIC 同理）
WEAK = NARR | set(
    """
    silver gold copper iron bronze brass jade wood stone marble silk cloth paper
    glass ceramic clay steel tool craft crafts made making work production design
    pattern object piece set pair bowl cup vessel pot jar mask bell knife
    tang song yuan ming qing zhou shang feng
    hand scroll landscape print ink art rock great long small new night white ancient
    imperial palace tomb emperor court reign era northern southern ancient modern
    china chinese asian
    cotton embroidery embroidered needlework needlepoint tapestry textile textiles
    brocade quilt shawl plate people costume clothing garments felt dye dyeing
    batik lace crochet cutting cut woodcut woodblock prints printing paper-cut
    event festival exhibition conference demonstration workshop woodcarving
    papercut paper-cut pottery figurine mural
    wool linen leather velvet satin hemp jute fur
    shoes boots jacket robe apron skirt
    """.split()
)

# 中国地域信号（省/主要城市/民族拼音）：弱词命中时的二次验证
REGION_PINYIN = (
    "yunnan sichuan guizhou hunan hubei shanxi shaanxi shandong henan hebei "
    "liaoning jilin heilongjiang gansu qinghai xinjiang tibet guangxi guangdong "
    "fujian zhejiang jiangsu anhui jiangxi hainan beijing shanghai tianjin "
    "chongqing suzhou hangzhou quanzhou xian luoyang changsha wuhan chengdu "
    "guiyang guangzhou nanjing manchu mongol miao tujia buyei zhuang qiang dai "
    "tibetan uighur uyghur inner-mongolia "
    "nantong weifang xuzhou wenzhou yiwu jingdezhen"
).split()
_PLACE = set(REGION_PINYIN)

# 色彩词：青花蓝白碗靠 blue/white 凑齐双命中配望江挑花——不算内容命中
_COLOR = {
    "red", "blue", "green", "white", "black", "yellow", "orange", "brown",
    "gray", "grey", "pink", "purple", "cyan", "silver", "golden", "blond",
}

# 英文词典：常见词（foil/painting/beating/tray…）一律不算锚点，专名（pangu/kunqu/
# wuhu…）才算——结构性替代逐词黑名单，杜绝 foil 撞镁箔闪光灯这类漏网。
def _load_dict() -> set[str]:
    try:
        with open("/usr/share/dict/words", encoding="utf-8", errors="ignore") as f:
            return {w.strip().lower() for w in f if w.strip()}
    except OSError:
        return set()


DICT = _load_dict()


def _is_weak_word(tok: str) -> bool:
    if tok in WEAK or tok in DICT:
        return True
    if tok.endswith("s") and tok[:-1] in DICT:  # shoes → shoe
        return True
    if tok.endswith("es") and tok[:-2] in DICT:  # boxes → box
        return True
    if tok.endswith("ing") and (tok[:-3] in DICT or tok[:-4] in DICT):  # coiling → coil
        return True
    if tok.endswith("ed") and (tok[:-1] in DICT or tok[:-2] in DICT):  # carved → carve
        return True
    return False


def _region_level(t: str, title: str) -> int:
    """弱词命中的地域背书强度：2=中文文件名（强），1=china/chinese/省州拼音（弱）。"""
    if CJK_RE.search(title):
        return 2
    if "china" in t or "chinese" in t:
        return 1
    if any(p in t for p in REGION_PINYIN):
        return 1
    return 0


def _has_word(t: str, tok: str) -> bool:
    """整词命中（带简单复数宽容），避免 'hand' 撞 'Handscroll'、'dai' 撞 'daily'。"""
    if re.search(r"\b" + re.escape(tok) + r"s?\b", t):
        return True
    if tok.endswith("s") and re.search(r"\b" + re.escape(tok[:-1]) + r"\b", t):
        return True
    return False


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


_rate_lock = threading.Lock()
_next_slot = [0.0]


def _pace(min_interval: float = 0.24) -> None:
    with _rate_lock:
        now = time.monotonic()
        wait = _next_slot[0] - now
        _next_slot[0] = max(now, _next_slot[0]) + min_interval
    if wait > 0:
        time.sleep(wait)


def _get(url: str, timeout: int = 30) -> bytes:
    last: Exception | None = None
    for attempt in range(4):
        _pace()
        try:
            with opener().open(url, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429, 500, 502, 503, 504):
                time.sleep((10 if e.code in (403, 429) else 2) * (attempt + 1))
                continue
            raise
        except Exception as e:  # noqa: BLE001 代理断连等
            last = e
            time.sleep(1.2 * (attempt + 1))
    raise last  # type: ignore[misc]


def latin_tokens(term: str) -> list[str]:
    return [w.lower() for w in re.findall(r"[A-Za-z]{3,}", term) if w.lower() not in STOP]


def cjk_shingles(term: str) -> list[str]:
    if not CJK_RE.search(term):
        return []
    chars = [c for c in term if CJK_RE.match(c)]
    return ["".join(chars[i : i + 2]) for i in range(len(chars) - 1)]


def query_variants(term: str) -> list[str]:
    if CJK_RE.search(term):
        base = [term]
        t = term.strip()
        if len(t) >= 4:
            base += [t[:3], t[-3:], t[-2:]]
        elif len(t) == 3:
            base += [t[-2:]]
        out: list[str] = []
        for v in base:
            if v and v not in out:
                out.append(v)
        return out[:4]
    words = term.split()
    if len(words) <= 2:
        return [term]
    base = [term, " ".join(words[:3]), " ".join(words[:2])]
    if len(words) >= 3:
        base.append(" ".join(words[-2:]))
    base.append(words[0])
    out = []
    for v in base:
        if v and v not in out:
            out.append(v)
    return out[:5]


def score_title(title: str, full_term: str, extra_toks: list[str], name_sh: tuple = ()) -> float:
    if BAD_PAT.search(title):
        return 0
    t = title.lower()
    full_lat = latin_tokens(full_term)
    of_hits = list(dict.fromkeys(tok for tok in full_lat if _has_word(t, tok)))
    ex_hits = [tok for tok in set(extra_toks) if _has_word(t, tok)]
    sh = cjk_shingles(full_term)
    cj = sum(1 for s in sh if s in title)
    nj = sum(1 for s in name_sh if s in title)
    if cj:
        return 10 + cj
    if nj:
        return 10 + nj
    anchors = [tok for tok in of_hits if tok not in _PLACE and not _is_weak_word(tok)]
    weak_of = [tok for tok in of_hits if tok in _PLACE or _is_weak_word(tok)]
    # 单个专名孤证不够（Pierre Meige/南通全景/上党战役旧址都靠它混过）：
    # 要么 ≥2 个专名，要么专名 + 至少 1 个语境弱词（词源与标题的交集）
    if len(anchors) >= 2 or (anchors and weak_of):
        return 5 + len(of_hits) + 0.5 * len(ex_hits)
    # 地域/词级背书用的非地名命中：色彩词不算（青花蓝白碗凑 color 词配望江挑花）
    content_hits = [tok for tok in of_hits if tok not in _PLACE and tok not in _COLOR]
    tl = full_term.lower()
    if len(content_hits) >= 2 and ("china" in tl or "chinese" in tl):
        # 词源自称中国 + 标题命中 ≥2 非地名词：词级地域背书
        return 5 + len(of_hits) + 0.5 * len(ex_hits)
    if of_hits or (not full_lat and len(ex_hits) >= 2):
        # 全是弱词命中：中文文件名/地域拼音背书都要求命中 ≥2（其中 ≥1 非地名，
        # 除非是中文文件名+任意双命中——防「菊花配宋锦」式单弱词撞图）
        lvl = _region_level(t, title)
        if lvl >= 2 and len(of_hits) >= 2:
            return 5 + len(of_hits) + 0.5 * len(ex_hits)
        if lvl == 1 and len(content_hits) >= 2:
            return 5 + len(of_hits) + 0.5 * len(ex_hits)
        return 0
    if not full_lat and ex_hits and _region_level(t, title):
        return 1 + 0.5 * len(ex_hits)
    return 0


def commons_candidates(term: str, full_term: str, extra_toks: list[str], name_sh: tuple = ()) -> list[dict]:
    for vi, variant in enumerate(query_variants(term)):
        best: list[dict] = []
        for mime in ("image/jpeg", "image/png") if vi == 0 else ("image/jpeg",):
            q = urllib.parse.urlencode(
                {
                    "action": "query",
                    "generator": "search",
                    "gsrsearch": f"{variant} filemime:{mime}",
                    "gsrnamespace": 6,
                    "gsrlimit": 20,
                    "prop": "imageinfo",
                    "iiprop": "url|extmetadata|size",
                    "iiurlwidth": 1400,
                    "format": "json",
                }
            )
            try:
                data = json.loads(_get(f"{COMMONS_API}?{q}").decode())
            except Exception as e:  # noqa: BLE001
                print(f"    commons {type(e).__name__} {getattr(e, 'code', '')} {variant!r}", flush=True)
                continue
            pages = data.get("query", {}).get("pages", {})
            ordered = sorted(pages.values(), key=lambda p: p.get("index", 99))
            hits: list[dict] = []
            for p in ordered:
                title = p.get("title", "")
                info = (p.get("imageinfo") or [{}])[0]
                url = info.get("thumburl") or info.get("url")
                if not url or not url.lower().split("?")[0].endswith(OK_EXT):
                    continue
                if (info.get("width") or 0) < 640:
                    continue
                sc = score_title(title, full_term, extra_toks, name_sh)
                if sc <= 0:
                    continue
                meta = info.get("extmetadata", {})
                hits.append(
                    {
                        "url": url,
                        "license": meta.get("LicenseShortName", {}).get("value", "see source"),
                        "title": title,
                        "source": "commons",
                        "landing": info.get("descriptionurl", ""),
                        "score": sc,
                    }
                )
            hits.sort(key=lambda x: -x["score"])
            best.extend(hits)
            if best:
                return best
            time.sleep(0.3)
        time.sleep(0.3)
    return []


def openverse_candidates(term: str, full_term: str, extra_toks: list[str], name_sh: tuple = ()) -> list[dict]:
    q = urllib.parse.urlencode(
        {"q": term, "page_size": 20, "license": "cc0,pdm,by,by-sa", "mature": "false"}
    )
    raw = _get(f"{OPENVERSE_API}?{q}")
    data = json.loads(raw.decode())
    out = []
    for r0 in data.get("results", []):
        title = str(r0.get("title") or "")
        if BAD_PAT.search(title):
            continue
        url = r0.get("url") or ""
        if not url.lower().split("?")[0].endswith(OK_EXT):
            continue
        w = r0.get("width") or 0
        if w and w < 640:
            continue
        sc = score_title(title, full_term, extra_toks, name_sh) or score_title(title, term, extra_toks, name_sh)
        if sc <= 0:
            continue
        lic = str(r0.get("license") or "")
        licv = str(r0.get("license_version") or "")
        if lic in {"pdm", "cc0"}:
            lic_full = "CC0" if lic == "cc0" else "Public domain"
        else:
            lic_full = f"CC {lic.upper()} {licv}".strip()
        out.append(
            {
                "url": url,
                "license": lic_full,
                "title": title,
                "source": "openverse",
                "landing": r0.get("foreign_landing_url") or "",
                "score": sc,
            }
        )
    out.sort(key=lambda x: -x["score"])
    return out


def download(item_id: str, hit: dict, term: str) -> bool:
    tmp = IMG_DIR / f"_v3_{item_id}"
    tmp.write_bytes(_get(hit["url"], timeout=60))
    if tmp.stat().st_size < 8 * 1024:
        tmp.unlink(missing_ok=True)
        return False
    out = IMG_DIR / f"{item_id}.jpg"
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "900", str(tmp), "--out", str(out)],
        check=True,
        capture_output=True,
    )
    tmp.unlink(missing_ok=True)
    if not out.exists() or out.stat().st_size < 15 * 1024:
        out.unlink(missing_ok=True)
        return False
    with _lock:
        credits = json.loads(CREDITS.read_text(encoding="utf-8"))
        credits[item_id] = {
            "license": hit["license"],
            "term": term,
            "title": hit["title"],
            "source": hit["source"],
            "landing": hit.get("landing", ""),
        }
        CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
    return True


def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"items": {}, "ov_used": 200, "urls": {}}


def save_state(st: dict) -> None:
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(STATE)


def terms_for(item: dict, terms2: dict, enrich: dict) -> list[str]:
    got = terms2.get(item["id"]) or []
    old = (enrich.get(item["id"]) or {}).get("img_terms") or []
    if isinstance(old, str):
        old = [old]
    merged = []
    for t in list(got) + list(old) + [item["name"]]:
        t = str(t).strip()
        if t and t not in merged:
            merged.append(t)
    return merged[:10]


def mark_done(iid: str, url: str) -> None:
    with _lock:
        st = load_state()
        st.setdefault("urls", {})[url] = iid
        st.setdefault("items", {})[iid] = "done"
        save_state(st)


def mark_miss(iid: str) -> None:
    with _lock:
        st = load_state()
        st.setdefault("items", {})[iid] = "miss"
        save_state(st)


def work(item: dict, terms: list[str], allow_reuse: bool, use_ov: bool, stats: dict) -> None:
    iid = item["id"]
    extra_toks: list[str] = []
    for t in terms:
        for tok in latin_tokens(t):
            if tok not in extra_toks:
                extra_toks.append(tok)
    name_sh = tuple(cjk_shingles(item.get("name") or ""))
    with _lock:
        st = load_state()
        used = st.get("urls", {})
    for t in terms:
        try:
            cands = commons_candidates(t, t, extra_toks, name_sh)
        except Exception as e:  # noqa: BLE001
            print(f"  {iid}: commons {type(e).__name__} {getattr(e, 'code', '')}", flush=True)
            time.sleep(3)
            continue
        for hit in cands:
            if not allow_reuse and hit["url"] in used and used[hit["url"]] != iid:
                continue
            try:
                if download(iid, hit, t):
                    mark_done(iid, hit["url"])
                    stats["done"] += 1
                    print(f"  {iid}: ← [{hit['source']}] {hit['title'][:56]} [{hit['license']}]", flush=True)
                    return
            except Exception as e:  # noqa: BLE001
                print(f"  {iid}: dl {type(e).__name__}: {e}", flush=True)
                break
        time.sleep(0.4)
    if use_ov:
        with _lock:
            st = load_state()
            ov_left = int(st.get("ov_used", 200))
        if ov_left > OV_BUDGET_MIN:
            for t in terms[:6]:
                with _lock:
                    st = load_state()
                    ov_left = int(st.get("ov_used", 200))
                if ov_left <= OV_BUDGET_MIN:
                    break
                try:
                    cands = openverse_candidates(t, t, extra_toks, name_sh)
                    with _lock:
                        st = load_state()
                        st["ov_used"] = max(int(st.get("ov_used", 200)) - 1, 0)
                        save_state(st)
                except Exception as e:  # noqa: BLE001
                    print(f"  {iid}: ov {type(e).__name__} {getattr(e, 'code', '')}", flush=True)
                    continue
                for hit in cands:
                    if not allow_reuse and hit["url"] in used and used[hit["url"]] != iid:
                        continue
                    try:
                        if download(iid, hit, t):
                            mark_done(iid, hit["url"])
                            stats["done"] += 1
                            print(f"  {iid}: ← [openverse] {hit['title'][:56]} [{hit['license']}]", flush=True)
                            return
                    except Exception as e:  # noqa: BLE001
                        print(f"  {iid}: dl {type(e).__name__}: {e}", flush=True)
                        break
                time.sleep(1.2)
    mark_miss(iid)
    stats["miss"] += 1


def main() -> None:
    limit = None
    use_ov = "--no-openverse" not in sys.argv
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    allow_reuse = "--reuse" in sys.argv
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    enrich = json.loads(ENRICH.read_text(encoding="utf-8")) if ENRICH.exists() else {}
    terms2 = json.loads(TERMS2.read_text(encoding="utf-8")) if TERMS2.exists() else {}

    todo = [i for i in items if not (IMG_DIR / f"{i['id']}.jpg").exists()]
    jobs = [(i, terms_for(i, terms2, enrich)) for i in todo]
    jobs = [j for j in jobs if j[1]]
    if limit is not None:
        jobs = jobs[:limit]
    print(f"待抓取 {len(jobs)} 项（词源 v2={len(terms2)}） reuse={allow_reuse} ov={use_ov}", flush=True)

    stats = {"done": 0, "miss": 0}
    from concurrent.futures import ThreadPoolExecutor, as_completed

    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = [ex.submit(work, i, t, allow_reuse, use_ov, stats) for i, t in jobs]
        for n, f in enumerate(as_completed(futs), 1):
            f.result()
            if n % 50 == 0:
                print(f"[{n}/{len(jobs)}] 新增 {stats['done']} 缺 {stats['miss']}", flush=True)
    print(f"完成：新增 {stats['done']}，仍缺 {stats['miss']}", flush=True)


if __name__ == "__main__":
    main()
