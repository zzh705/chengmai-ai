"""为新增非遗项目抓取 Wikimedia Commons 配图（自由版权）。

用法：backend/.venv/bin/python scripts/fetch_images.py
- 按 TERMS 里的搜索词在 Commons 搜图，取第一张 jpeg/png
- 下载缩略图 → sips 压到宽 900 → frontend/public/images/heritage/<id>.jpg
- 追加 credits.json：{id: {license, term}}
- 搜不到的项目跳过（前端会显示字卡兜底）
"""
import json
import os
import ssl
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "frontend" / "public" / "images" / "heritage"
PROXY = "http://127.0.0.1:7890"
OPENER = urllib.request.build_opener(
    urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}),
    urllib.request.HTTPSHandler(context=ssl.create_default_context()),
)
OPENER.addheaders = [("User-Agent", "chengmai-ai/1.0 (competition project; contact: zzh705)")]

# 项目 id → Commons 英文搜索词
TERMS = {
    "h_hezhe": "Hezhe fish skin clothing",
    "h_nonglewu": "Korean nongak farmer dance",
    "h_xiuyan": "Chinese jade carving sculpture",
    "h_guxiu": "Gu embroidery",
    "h_tuiuang": "Chinese lacquerware box",
    "h_zhuxian": "Chinese New Year woodblock print",
    "h_hanxiu": "Chinese gold thread embroidery",
    "h_xiangxiu": "Hunan embroidery tiger",
    "h_dongda": "Dong ethnic choir Guizhou",
    "h_lizu": "Li people textile Hainan",
    "h_liangping": "Liangping Chongqing county",
    "h_laran": "Miao batik",
    "h_tangka": "Thangka painting",
    "h_huaer": "Chinese folk singing gathering",
    "h_shanhuaer": "Ningxia China landscape",
    "h_mukamu": "Uyghur Muqam",
    "h_gspiy": "Chinese shadow play puppet",
    "h_hkqingjiao": "Cheung Chau Bun Festival",
    "h_motauju": "Macau theatre play",
}
# 精确词搜不到时的地域回退词（宁可放地域相关图，也不放无关古籍扫描）
FALLBACK = {
    "h_xiangxiu": "Chinese silk embroidery",
    "h_liangping": "Chongqing landscape",
    "h_huaer": "Qinghai lake landscape",
    "h_shanhuaer": "Ningxia China landscape",
    "h_motauju": "Macau city street",
    "h_tuiuang": "Chinese lacquer box",
}
API = "https://commons.wikimedia.org/w/api.php"


def search(term: str):
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            # filemime 过滤掉 PDF/书籍扫描等非图片文件
            "gsrsearch": f"{term} filemime:image/jpeg",
            "gsrnamespace": 6,
            "gsrlimit": 10,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": 1400,
            "format": "json",
        }
    )
    with OPENER.open(f"{API}?{q}", timeout=30) as r:
        data = json.loads(r.read().decode())
    pages = data.get("query", {}).get("pages", {})
    # generator 返回按相关度排序的 page，按 index 取
    ordered = sorted(pages.values(), key=lambda p: p.get("index", 99))
    for p in ordered:
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        if not url or not url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png")):
            continue
        meta = info.get("extmetadata", {})
        return {
            "url": url,
            "license": meta.get("LicenseShortName", {}).get("value", "see source"),
            "title": p.get("title", ""),
        }
    return None


def fetch(item_id: str, term: str) -> bool:
    hit = search(term)
    if not hit:
        print(f"  {item_id}: 未找到图片 ← {term}")
        return False
    tmp = IMG_DIR / f"_tmp_{item_id}"
    with OPENER.open(hit["url"], timeout=60) as r:
        tmp.write_bytes(r.read())
    out = IMG_DIR / f"{item_id}.jpg"
    # sips：转 jpeg + 限制最大宽度 900
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "900", str(tmp), "--out", str(out)],
        check=True,
        capture_output=True,
    )
    tmp.unlink(missing_ok=True)
    size = out.stat().st_size
    credits_path = IMG_DIR / "credits.json"
    credits = json.loads(credits_path.read_text(encoding="utf-8"))
    credits[item_id] = {"license": hit["license"], "term": term, "title": hit["title"]}
    credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  {item_id}: {size // 1024}KB ← {hit['title'][:50]} [{hit['license']}]")
    return True


def main() -> None:
    import time

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for item_id, term in TERMS.items():
        if (IMG_DIR / f"{item_id}.jpg").exists():
            print(f"  {item_id}: 已存在，跳过")
            ok += 1
            continue
        # Commons 有限流：逐个抓取并留间隔，429 时退避重试；精确词失败再试地域回退词
        terms = [term] + ([FALLBACK[item_id]] if item_id in FALLBACK else [])
        done = False
        for t in terms:
            if done:
                break
            for attempt in range(3):
                try:
                    if fetch(item_id, t):
                        ok += 1
                        done = True
                    break
                except urllib.error.HTTPError as e:
                    if e.code == 429 and attempt < 2:
                        time.sleep(8 * (attempt + 1))
                        continue
                    print(f"  {item_id}: 失败 HTTP {e.code}")
                    break
                except Exception as e:  # noqa: BLE001
                    print(f"  {item_id}: 失败 {type(e).__name__}: {e}")
                    break
            time.sleep(2.5)
    print(f"完成 {ok}/{len(TERMS)}")


if __name__ == "__main__":
    main()
