"""索引层 3250 项升级为「苏绣级」规格：一分钟讲述 / 大事年表 / 冷知识 / 数据亮点 / 代表作品 / 配图检索词。

流程（幂等，可断点续传）：
1. 读 heritage_items.json 中 tier='index' 且 story 为空的条目；
2. 按 8 条/批 调用 LLM 生成 story / timeline / fun_facts / wow_numbers /
   representative_works / img_terms，写入 index_enrich.json（按 id 断点续传）；
3. 全部完成后合并回 heritage_items.json（只补空字段，不动已有深读内容）。

img_terms 不进知识库条目，供 scripts/fetch_images_bulk.py 在 Wikimedia Commons 搜图。

用法: python3 scripts/enrich_full.py [--merge-only]
"""

import json
import pathlib
import re
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from app.services.llm import chat  # noqa: E402
from app.utils.json_parse import strip_emoji  # noqa: E402

ITEMS = ROOT / "data" / "structured" / "heritage_items.json"
ENRICH = ROOT / "data" / "structured" / "index_enrich.json"

SYSTEM = (
    "你是「承脉AI」的非遗内容编审，写作风格克制、具体、有画面感，像博物馆说明牌与老匠人口述的结合。"
    "只写确知的事实或基于名称、地域、大类的稳妥概述，不编造人名、年份、奖项、销量；"
    "不确定的字段返回空值。不用 emoji，不用 Markdown。"
)

PROMPT = """下列是国家级非物质文化遗产名录条目（已有简介与技艺概述）：
{rows}

请为每一项补全「苏绣级」叙事字段，严格返回 JSON 数组（长度与输入一致，按顺序）：
[
  {{
    "id": "原样返回 id",
    "story": "110~160 字一分钟讲述：从一个具体画面或细节切入，讲清它是什么、怎么做、为何珍贵，口语化但不油滑",
    "timeline": [{{"year": "朝代或年代", "event": "30~60 字关键节点"}}, ...],
    "fun_facts": ["40~80 字具体可感的冷知识", ...],
    "wow_numbers": [{{"value": 数字, "suffix": "单位", "label": "10~16 字说明"}}, ...],
    "representative_works": ["确知的代表作品或典型品类", ...],
    "img_terms": ["English search term for Wikimedia Commons", ...]
  }}
]

约束：
- timeline 3~5 条，年份可用朝代/世纪/「当代」；fun_facts 2~3 条；wow_numbers 2~3 条（value 用阿拉伯数字，如 2000、48、12）；
- representative_works 只写确知的代表性作品/典型品类，不确定返回 []；
- img_terms 1~2 个英文检索词（如 "Suzhou embroidery"、"Nanjing brocade"），用于在 Wikimedia Commons 搜到该项目的实拍图，宁可具体，不要泛词（如 "China"）；
- 民俗、节庆类没有工艺的，story 讲习俗场景即可。"""

_lock = threading.Lock()


def load_enrich() -> dict:
    if ENRICH.exists():
        return json.loads(ENRICH.read_text(encoding="utf-8"))
    return {}


def save_enrich(data: dict) -> None:
    tmp = ENRICH.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(ENRICH)


def load_items() -> list[dict]:
    return json.loads(ITEMS.read_text(encoding="utf-8"))


def build_todo(items: list[dict]) -> list[dict]:
    return [
        i
        for i in items
        if i.get("tier") == "index" and not (i.get("story") or "").strip()
    ]


def row_line(r: dict) -> str:
    desc = re.sub(r"\s+", " ", r.get("description") or "")[:150]
    craft = re.sub(r"\s+", " ", r.get("craft_process") or "")[:80]
    era = r.get("era") or ""
    return f"{r['id']} | {r['name']} | {r['category']} | {r['region']} | {era} | {desc} | {craft}"


def valid(entry: dict) -> bool:
    if len((entry.get("story") or "").strip()) < 60:
        return False
    if not isinstance(entry.get("timeline"), list) or len(entry["timeline"]) < 2:
        return False
    if not isinstance(entry.get("fun_facts"), list) or not entry["fun_facts"]:
        return False
    return True


def gen_batch(rows: list[dict]) -> None:
    lines = "\n".join(row_line(r) for r in rows)
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            out = chat(PROMPT.format(rows=lines), system=SYSTEM, temperature=0.5)
            text = strip_emoji(out)
            match = re.search(r"\[.*\]", text, re.S)
            if not match:
                raise ValueError("未返回 JSON 数组")
            arr = json.loads(match.group(0))
            got = {str(x.get("id")): x for x in arr if isinstance(x, dict)}
            data = load_enrich()
            n = 0
            for r in rows:
                e = got.get(r["id"])
                if not e or not valid(e):
                    continue
                data[r["id"]] = {
                    "story": (e.get("story") or "").strip(),
                    "timeline": [
                        {
                            "year": str(t.get("year", "")).strip(),
                            "event": str(t.get("event", "")).strip(),
                        }
                        for t in (e.get("timeline") or [])
                        if isinstance(t, dict) and str(t.get("event", "")).strip()
                    ],
                    "fun_facts": [
                        str(x).strip() for x in (e.get("fun_facts") or []) if str(x).strip()
                    ],
                    "wow_numbers": [
                        {
                            "value": w.get("value"),
                            "suffix": str(w.get("suffix", "")).strip(),
                            "label": str(w.get("label", "")).strip(),
                        }
                        for w in (e.get("wow_numbers") or [])
                        if isinstance(w, dict) and w.get("value") is not None
                    ],
                    "representative_works": [
                        str(x).strip()
                        for x in (e.get("representative_works") or [])
                        if str(x).strip()
                    ],
                    "img_terms": [
                        str(x).strip()
                        for x in (e.get("img_terms") or [])
                        if str(x).strip()
                    ][:2],
                }
                n += 1
            if n == 0:
                raise ValueError("全部行无效")
            with _lock:
                save_enrich(data)
            return
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"批次失败: {last_err}")


def merge(items: list[dict], data: dict) -> int:
    n = 0
    for it in items:
        if it.get("tier") != "index":
            continue
        e = data.get(it["id"])
        if not e:
            continue
        changed = False
        if not (it.get("story") or "").strip() and e.get("story"):
            it["story"] = e["story"]
            changed = True
        if not it.get("timeline") and e.get("timeline"):
            it["timeline"] = e["timeline"]
            changed = True
        if not it.get("fun_facts") and e.get("fun_facts"):
            it["fun_facts"] = e["fun_facts"]
            changed = True
        if not it.get("wow_numbers") and e.get("wow_numbers"):
            it["wow_numbers"] = e["wow_numbers"]
            changed = True
        if not it.get("representative_works") and e.get("representative_works"):
            it["representative_works"] = e["representative_works"]
            changed = True
        if changed:
            it["enrich_v"] = 2
            n += 1
    return n


def main() -> None:
    merge_only = "--merge-only" in sys.argv
    items = load_items()
    todo = build_todo(items)
    data = load_enrich()
    pending = [r for r in todo if r["id"] not in data]
    print(f"待生成 {len(pending)} / 索引层待升级 {len(todo)}", flush=True)

    if not merge_only and pending:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        BATCH = 8
        batches = [pending[i : i + BATCH] for i in range(0, len(pending), BATCH)]
        done = 0
        with ThreadPoolExecutor(max_workers=6) as ex:
            futs = {ex.submit(gen_batch, b): b for b in batches}
            for f in as_completed(futs):
                batch = futs[f]
                try:
                    f.result()
                    done += 1
                    if done % 10 == 0:
                        print(f"[{done}/{len(batches)}] 批", flush=True)
                except Exception as e:  # noqa: BLE001
                    names = "、".join(r["name"] for r in batch)
                    print(f"FAIL 批({names[:60]}…): {e}", flush=True)
            print("线程池结束", flush=True)
        data = load_enrich()
        print(f"enrich 完成 {len(data)}", flush=True)

    data = load_enrich()
    items = load_items()
    changed = merge(items, data)
    tmp = ITEMS.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(ITEMS)
    still = [r for r in build_todo(items) if r["id"] not in data]
    print(f"合并更新 {changed} 条，共 {len(items)} 项；仍缺 story {len(still)} 项", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
