"""抓取中国非物质文化遗产网「国家级项目名录」全量列表（幂等，可断点续传）。

来源: https://www.ihchina.cn/getProject.html （分页 API, 每页 10 条）
输出: data/structured/national_raw.json
      [{id, name, province, project_num, reg_type}, ...] 按 (name, province) 去重

用法: python3 scripts/fetch_national.py
"""

import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "structured" / "national_raw.json"
BASE = "https://www.ihchina.cn"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}


def get_json(url: str) -> dict:
    last = None
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1 + i)
    raise RuntimeError(f"fetch failed {url}: {last}")


def main() -> None:
    first = get_json(f"{BASE}/getProject.html")
    total = first["total"]
    pages = int(first["links"]["end"]["url"].rsplit("/p/", 1)[1].split(".")[0])
    print(f"total={total} pages={pages}")

    rows: list[dict] = []
    for p in range(1, pages + 1):
        data = first if p == 1 else get_json(f"{BASE}/getProject/p/{p}.html")
        for it in data.get("list", []):
            rows.append(
                {
                    "id": it.get("id"),
                    "name": (it.get("title") or "").strip(),
                    "province": (it.get("province") or it.get("unit") or "").strip(),
                    "project_num": (it.get("project_num") or "").strip(),
                    "reg_type": it.get("reg_type") or "",
                }
            )
        if p % 50 == 0:
            print(f"  page {p}/{pages}  rows={len(rows)}")

    seen: set[tuple[str, str]] = set()
    dedup: list[dict] = []
    for r in rows:
        if not r["name"]:
            continue
        key = (r["name"], r["province"])
        if key in seen:
            continue
        seen.add(key)
        dedup.append(r)

    OUT.write_text(json.dumps(dedup, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done: raw={len(rows)} dedup={len(dedup)} -> {OUT}")


if __name__ == "__main__":
    main()
