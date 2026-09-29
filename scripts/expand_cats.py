#!/usr/bin/env python3
"""扩充真实类目清单（零幻觉）：
1. 现有有效类目的子类（gcmtype=subcat）——保证存在；
2. Category 命名空间搜索（srnamespace=14）——搜出来的类目必存在。
输出 data/structured/commons_categories3.json。

用法：backend/.venv/bin/python -u scripts/expand_cats.py
"""
from __future__ import annotations

import json
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_images_v3 import _get  # noqa: E402

API = "https://commons.wikimedia.org/w/api.php"
POOL = ROOT / "data/structured/commons_pool.jsonl"
EXISTING = ROOT / "data/structured/commons_categories.json"
C2 = ROOT / "data/structured/commons_categories2.json"
OUT = ROOT / "data/structured/commons_categories3.json"

# 非遗主题的分类搜索词（英文；Commons 分类多为英文）
KEYWORDS = """
Chinese embroidery Chinese wood carving Chinese papercutting Chinese kite
Chinese lantern Chinese opera Chinese shadow puppetry Chinese puppet
Chinese pottery Chinese porcelain Chinese jade carving Chinese cloisonne
Chinese lacquerware Chinese enamel Chinese silverwork Chinese bronze
Chinese silk weaving Chinese brocade Chinese batik Chinese tie-dye
Chinese knitting Chinese weaving Chinese basketry Chinese papier-mache
Chinese clay sculpture Chinese dough figurine Chinese sugar painting
Chinese calligraphy Chinese seal carving Chinese woodblock printing
Chinese New Year print Chinese clay painting Chinese kite festival
Chinese dragon dance Chinese lion dance Chinese acrobatics Chinese martial arts
Chinese folk music Chinese string instrument Chinese wind instrument
Chinese drum Chinese flute Chinese opera costume Chinese opera mask
Chinese festival Chinese temple fair Chinese dragon boat
Chinese dumpling Chinese tea processing Chinese liquor Chinese medicine
Chinese herbal Chinese acupuncture Chinese massage
Miao embroidery Miao silver Dong people Zhuang people Yi people
Tibetan thangka Uyghur music Mongolian music Manchu
Suzhou embroidery Shu embroidery Hunan embroidery Guangdong embroidery
Dongyang wood carving Huizhou wood carving Chinese furniture
Jingdezhen porcelain Longquan celadon Cizhou ware
Chinese paper cutting Nianhua Chinese New Year picture
Chinese folk painting Chinese cartoon shadow
Wushu Taijiquan Chinese chess
Chinese incense Chinese umbrella Chinese fan Chinese hat
Chinese coppersmith Chinese blacksmith Chinese wheelwright
Chinese lantern festival Mid-Autumn Festival Qingming Festival
Chinese bun Chinese noodle Chinese rice cake Chinese preserved food
Chinese hotpot Chinese roast duck Chinese tofu
Chinese papermaking Chinese folding fan Chinese kite making
Chinese guqin Chinese erhu Chinese pipa Chinese suona Chinese percussion
Chinese architectural carving Chinese stone carving Chinese brick carving
Chinese porcelain painting Chinese enamel painting
Chinese ethnic costume Chinese headdress Chinese textile
Chinese applique Chinese patchwork Chinese cross stitch
""".split()

# 整词短语处理：KEYWORDS 按行已拆；搜索时用短语
PHRASES = [p for p in """
Chinese embroidery|Chinese wood carving|Chinese papercutting|Chinese kite
Chinese lantern|Chinese opera|Chinese shadow puppetry|Chinese puppet
Chinese pottery|Chinese porcelain|Chinese jade carving|Chinese cloisonne
Chinese lacquerware|Chinese silverwork|Chinese bronze casting
Chinese silk|Chinese brocade|Chinese batik|Chinese tie-dye
Chinese weaving|Chinese basketry|Chinese papier-mache|Chinese clay sculpture
Chinese dough figurine|Chinese sugar painting|Chinese calligraphy
Chinese seal carving|Chinese woodblock printing|Chinese New Year print
Chinese dragon dance|Chinese lion dance|Chinese acrobatics|Chinese martial arts
Chinese folk music|Chinese string instrument|Chinese opera costume
Chinese opera mask|Chinese festival|Chinese temple fair|Chinese dragon boat
Chinese dumpling|Chinese tea|Chinese liquor|Chinese medicine|Chinese acupuncture
Miao embroidery|Miao silver|Dong people|Zhuang people|Yi people
Tibetan thangka|Uyghur music|Mongolian music|Manchu
Suzhou embroidery|Shu embroidery|Hunan embroidery|Guangdong embroidery
Dongyang wood carving|Huizhou wood carving|Jingdezhen porcelain
Longquan celadon|Cizhou ware|Chinese paper cutting|Nianhua
Wushu|Taijiquan|Chinese incense|Chinese umbrella|Chinese fan
Chinese blacksmith|lantern festival|Mid-Autumn Festival
Chinese noodle|Chinese rice cake|Chinese tofu|Chinese papermaking
Chinese guqin|Chinese erhu|Chinese pipa|Chinese suona
Chinese stone carving|Chinese brick carving|Chinese enamel painting
Chinese ethnic costume|Chinese headdress|Chinese applique|Chinese cross stitch
Chinese festival dance|Chinese folk dance|Chinese orchestra
chinese paper|chinese knotting|chinese woodwork|chinese furniture
chinese mask|chinese painting|chinese ceramic|chinese lacquer
chinese embroidery tools|chinese textile|chinese carpet|chinese rug
""".replace("\n", "|").split("|") if p.strip()]


def subcats_of(cat: str) -> list[str]:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Category:{cat}",
            "cmtype": "subcat",
            "cmlimit": "500",
            "format": "json",
        }
    )
    try:
        data = json.loads(_get(f"{API}?{q}").decode())
    except Exception as e:  # noqa: BLE001
        print(f"  subcat {cat}: {type(e).__name__}", flush=True)
        return []
    out = []
    for m in data.get("query", {}).get("categorymembers", []):
        t = m.get("title", "")
        if t.startswith("Category:"):
            out.append(t[len("Category:") :])
    return out


def search_cats(phrase: str) -> list[str]:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": phrase,
            "srnamespace": "14",
            "srlimit": "30",
            "format": "json",
        }
    )
    try:
        data = json.loads(_get(f"{API}?{q}").decode())
    except Exception as e:  # noqa: BLE001
        print(f"  search {phrase!r}: {type(e).__name__}", flush=True)
        return []
    out = []
    for m in data.get("query", {}).get("search", []):
        t = m.get("title", "")
        if t.startswith("Category:"):
            out.append(t[len("Category:") :])
    return out


def main() -> None:
    have: set[str] = set(json.loads(EXISTING.read_text(encoding="utf-8")))
    if C2.exists():
        have |= set(json.loads(C2.read_text(encoding="utf-8")))
    member_cats: set[str] = set()
    for line in POOL.read_text(encoding="utf-8").splitlines():
        try:
            member_cats.add(json.loads(line)["cat"])
        except Exception:  # noqa: BLE001
            continue
    print(f"基准类目 {len(have)}，有成员类目 {len(member_cats)}", flush=True)

    found: set[str] = set()
    # 1) 有效类目的子类
    for i, cat in enumerate(sorted(member_cats), 1):
        subs = subcats_of(cat)
        found |= set(subs) - have
        if i % 10 == 0:
            print(f"  子类进度 {i}/{len(member_cats)}，新发现 {len(found)}", flush=True)
    print(f"子类共发现新 {len(found)}", flush=True)

    # 2) 分类命名空间搜索
    for i, phrase in enumerate(PHRASES, 1):
        hits = search_cats(phrase.strip())
        found |= set(hits) - have
        if i % 20 == 0:
            print(f"  搜索进度 {i}/{len(PHRASES)}，累计新 {len(found)}", flush=True)
    found = {c for c in found if len(c) > 3}
    print(f"合计新真实类目 {len(found)}", flush=True)
    prev = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    merged = list(dict.fromkeys(prev + sorted(found)))
    OUT.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"写入 {OUT}（{len(merged)}）", flush=True)


if __name__ == "__main__":
    main()
