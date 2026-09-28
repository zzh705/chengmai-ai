"""索引层 3250 项补 representative_inheritors（严格防编造：不确定就返回空）。

流程（幂等，可断点续传）：
1. 读 heritage_items.json 中 representative_inheritors 为空的条目；
2. 按 10 条/批 调用 LLM，只允许返回「公开可查、广泛记载」的代表性传承人，
   宁缺毋滥，拿不准一律 []，写入 index_inheritors.json（按 id 断点续传）；
3. 合并时只补空字段，不覆盖已有深读内容。

用法: python3 scripts/enrich_inheritors.py [--merge-only]
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
OUT = ROOT / "data" / "structured" / "index_inheritors.json"

SYSTEM = (
    "你是「承脉AI」的非遗名录编审，对国家级/省级代表性传承人名单有严格考证习惯。"
    "绝对不编造人名；拿不准就返回空数组。不用 emoji，不用 Markdown。"
)

PROMPT = """下列是国家级非物质文化遗产名录条目：
{rows}

请为每一项给出「代表性传承人」名单，严格返回 JSON 数组（长度与输入一致，按顺序）：
[
  {{"id": "原样返回 id", "inheritors": ["姓名（级别简注）", ...]}}
]

铁律：
- 只写公开资料广泛记载的真实传承人（如「国家级代表性传承人」「省级代表性传承人」）；
- 绝不推测、绝不拼凑、绝不编造任何姓名；只要不是你确知的，一律返回 []；
- 大多数普通条目没有广为人知的传承人，返回 [] 是正常且正确的答案；
- 每项最多 3 人；级别不确定就写「（代表性传承人）」，宁可省略级别也不写错；
- 格式如「姚惠芬（国家级代表性传承人）」，不要附带生平、年份、成就。"""

NAME_RE = re.compile(r"^[\u4e00-\u9fa5·]{2,6}（[\u4e00-\u9fa5·、]{2,20}）$")

_lock = threading.Lock()


def load_out() -> dict:
    if OUT.exists():
        return json.loads(OUT.read_text(encoding="utf-8"))
    return {}


def save_out(data: dict) -> None:
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(OUT)


def load_items() -> list[dict]:
    return json.loads(ITEMS.read_text(encoding="utf-8"))


def build_todo(items: list[dict]) -> list[dict]:
    return [i for i in items if not (i.get("representative_inheritors") or [])]


def row_line(r: dict) -> str:
    desc = re.sub(r"\s+", " ", r.get("description") or "")[:120]
    era = r.get("era") or ""
    return f"{r['id']} | {r['name']} | {r['category']} | {r['region']} | {era} | {desc}"


def valid_names(arr) -> list[str]:
    out = []
    for x in arr or []:
        s = str(x).strip()
        if NAME_RE.match(s):
            out.append(s)
    return out[:3]


def gen_batch(rows: list[dict]) -> None:
    lines = "\n".join(row_line(r) for r in rows)
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            out = chat(PROMPT.format(rows=lines), system=SYSTEM, temperature=0.2)
            text = strip_emoji(out)
            match = re.search(r"\[.*\]", text, re.S)
            if not match:
                raise ValueError("未返回 JSON 数组")
            arr = json.loads(match.group(0))
            got = {str(x.get("id")): x for x in arr if isinstance(x, dict)}
            data = load_out()
            n = 0
            for r in rows:
                if r["id"] in data:
                    continue
                e = got.get(r["id"])
                data[r["id"]] = valid_names(e.get("inheritors") if e else None)
                n += 1
            if n == 0 and all(r["id"] in data for r in rows):
                return
            with _lock:
                save_out(data)
            return
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"批次失败: {last_err}")


def merge(items: list[dict], data: dict) -> int:
    n = 0
    for it in items:
        if it.get("representative_inheritors"):
            continue
        names = data.get(it["id"])
        if names:
            it["representative_inheritors"] = names
            n += 1
    return n


def main() -> None:
    merge_only = "--merge-only" in sys.argv
    items = load_items()
    todo = build_todo(items)
    data = load_out()
    pending = [r for r in todo if r["id"] not in data]
    print(f"待生成 {len(pending)} / 缺传承人 {len(todo)}", flush=True)

    if not merge_only and pending:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        BATCH = 10
        batches = [pending[i : i + BATCH] for i in range(0, len(pending), BATCH)]
        done = 0
        with ThreadPoolExecutor(max_workers=4) as ex:
            futs = {ex.submit(gen_batch, b): b for b in batches}
            for f in as_completed(futs):
                batch = futs[f]
                try:
                    f.result()
                    done += 1
                    if done % 20 == 0:
                        print(f"[{done}/{len(batches)}] 批", flush=True)
                except Exception as e:  # noqa: BLE001
                    names = "、".join(r["name"] for r in batch)
                    print(f"FAIL 批({names[:60]}…): {e}", flush=True)
            print("线程池结束", flush=True)
        data = load_out()
        filled = sum(1 for v in data.values() if v)
        print(f"生成完成 {len(data)} 条，其中有传承人 {filled} 条", flush=True)

    data = load_out()
    items = load_items()
    changed = merge(items, data)
    tmp = ITEMS.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(ITEMS)
    still = [r for r in build_todo(items) if r["id"] not in data]
    print(f"合并更新 {changed} 条，仍缺记录 {len(still)} 项", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
