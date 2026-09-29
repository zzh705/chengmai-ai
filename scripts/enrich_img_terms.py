"""为缺图条目生成多路图片检索词（8 词/项：6 英 + 2 中），供 fetch_images_v3 使用。

词源设计以「可拍到的视觉主体」为先：成品器物、工序场面、演出画面、服饰道具、
节庆场景；民间文学类转向传说地点/说唱艺人/壁画插图等可视形象。

用法: python3 scripts/enrich_img_terms.py [--only-missing]
断点: data/structured/img_terms_v2.json（id → terms，存在即跳过）
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
IMG_DIR = ROOT / "frontend" / "public" / "images" / "heritage"
OUT = ROOT / "data" / "structured" / "img_terms_v2.json"

SYSTEM = (
    "你是「承脉AI」的图片检索编审，擅长为 Wikimedia Commons 检索非遗实拍照片。"
    "只输出严格 JSON，不编造无关词。"
)

PROMPT = """下列非遗项目需要找到能代表它们的实拍照片：
{rows}

为每一项生成 8 个检索词，严格返回 JSON 数组（长度与输入一致，按顺序）：
[{{"id": "原样返回 id", "terms": ["en1", "en2", "en3", "en4", "en5", "en6", "zh1", "zh2"]}}]

要求：
- 前 6 个英文（2~5 词，具体）：①最直接的对象/剧种/工艺名（如 "Suzhou embroidery"、"Kunqu opera"）；②~④工序、道具、演出/节庆场面变体词；⑤~⑥地域+主体组合词（如 "Jiangsu embroidery workshop"）；
- 后 2 个中文（简/常用写法，可含地域前缀）；
- 必须是「拍得到画面」的词：器物、工序、舞台、服饰、道具、场景、人；
- 禁止空泛词：China、Chinese、traditional、culture、ancient 单独或作主体；
- 民间文学/传说类：转向可视形象——传说发生地、说唱/讲故事艺人、壁画年画插图、相关仪式；
- 每项词互不相同，宁可具体不可重复同义。"""

_lock = threading.Lock()


def load_out() -> dict:
    if OUT.exists():
        return json.loads(OUT.read_text(encoding="utf-8"))
    return {}


def save_out(data: dict) -> None:
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(OUT)


def valid_terms(arr) -> list[str]:
    out = []
    for x in arr or []:
        s = str(x).strip()
        if not s or len(s) > 60 or len(s) < 3:
            continue
        if s.lower() in {"china", "chinese", "traditional", "culture"}:
            continue
        if s not in out:
            out.append(s)
    return out[:8]


def row_line(r: dict) -> str:
    desc = re.sub(r"\s+", " ", r.get("description") or "")[:110]
    return f"{r['id']} | {r['name']} | {r['category']} | {r.get('region','')} | {r.get('era','')} | {desc}"


def gen_batch(rows: list[dict], data: dict) -> None:
    lines = "\n".join(row_line(r) for r in rows)
    last: Exception | None = None
    for _ in range(3):
        try:
            out = strip_emoji(chat(PROMPT.format(rows=lines), system=SYSTEM, temperature=0.4))
            match = re.search(r"\[.*\]", out, re.S)
            if not match:
                raise ValueError("no json array")
            arr = json.loads(match.group(0))
            got = {str(x.get("id")): x for x in arr if isinstance(x, dict)}
            with _lock:
                cur = load_out()
                n = 0
                for r in rows:
                    if r["id"] in cur:
                        continue
                    terms = valid_terms(got.get(r["id"], {}).get("terms"))
                    if len(terms) >= 5:
                        cur[r["id"]] = terms
                        n += 1
                save_out(cur)
            if n == 0 and all(r["id"] in load_out() for r in rows):
                return
            return
        except Exception as e:  # noqa: BLE001
            last = e
    raise RuntimeError(f"batch failed: {last}")


def main() -> None:
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    if "--only-missing" in sys.argv:
        todo = [i for i in items if not (IMG_DIR / f"{i['id']}.jpg").exists()]
    else:
        todo = list(items)
    data = load_out()
    pending = [r for r in todo if r["id"] not in data]
    print(f"待生成词源 {len(pending)} / 目标 {len(todo)}（已有 {len(data)}）", flush=True)
    if not pending:
        return
    from concurrent.futures import ThreadPoolExecutor, as_completed

    BATCH = 10
    batches = [pending[i : i + BATCH] for i in range(0, len(pending), BATCH)]
    done = fail = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(gen_batch, b, data): b for b in batches}
        for f in as_completed(futs):
            try:
                f.result()
                done += 1
            except Exception as e:  # noqa: BLE001
                fail += 1
                print(f"FAIL: {e}", flush=True)
            if done % 20 == 0:
                print(f"[{done}/{len(batches)}] 批 (fail {fail})", flush=True)
    print(f"完成：{done} 批成功，{fail} 批失败，总计 {len(load_out())}", flush=True)


if __name__ == "__main__":
    main()
