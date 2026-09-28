"""深度扩充知识库字段（幂等，可断点续传）。

对 heritage_items.json 中每个项目重写三件套：
- description:        260~360 字，事实优先、按「是什么-何地何时-为何珍贵」组织
- cultural_meaning:   200~280 字，精神内涵 / 祭祀-礼俗-社区功能 / 当代价值
- craft_process:      200~300 字，按核心工序顺序叙述，点出关键工序名

规则：只基于原文 + 公认常识，不确定的信息宁可不写；无 emoji、无 Markdown 标题。
版本号写入 item["expand_version"]，>= 2 的项目跳过。

用法: python3 scripts/expand_fields.py [--only id1,id2]
"""

import json
import pathlib
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from app.services.llm import chat  # noqa: E402
from app.utils.json_parse import extract_json  # noqa: E402

ITEMS = ROOT / "data" / "structured" / "heritage_items.json"
TARGET_VERSION = 2

SYSTEM = (
    "你是「承脉 AI」的非遗内容编审，服务对象是青少年与海外中文学习者。"
    "写作要求：准确、具体、克制而有温度；优先保留原文中的确定事实，"
    "不确定的信息不要写；不用 emoji，不用 Markdown 标题与列表符号，"
    "纯中文段落。"
)

PROMPT = """以下是非遗项目「{name}」的现有资料：

【类别】{category}
【地域】{region}
【时代】{era}
【简介】{description}
【文化内涵】{cultural_meaning}
【技艺工序】{craft_process}
【代表作品】{works}
【代表性传承人】{inheritors}

请在现有事实基础上适度扩充这三部分，使其内容饱满但不注水。严格返回 JSON：
{{
  "description": "260~360 字项目简介",
  "cultural_meaning": "200~280 字文化内涵",
  "craft_process": "200~300 字技艺工序（按工序顺序）"
}}"""

_lock = threading.Lock()


def save(items: list[dict]) -> None:
    tmp = ITEMS.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(ITEMS)


def expand(item: dict) -> bool:
    prompt = PROMPT.format(
        name=item["name"],
        category=item.get("category", ""),
        region=item.get("region", ""),
        era=item.get("era", ""),
        description=item.get("description", ""),
        cultural_meaning=item.get("cultural_meaning", ""),
        craft_process=item.get("craft_process", ""),
        works="、".join(item.get("representative_works", [])) or "暂无",
        inheritors="、".join(item.get("representative_inheritors", [])) or "暂无",
    )
    out = extract_json(chat(prompt, system=SYSTEM))
    desc = (out.get("description") or "").strip()
    cult = (out.get("cultural_meaning") or "").strip()
    craft = (out.get("craft_process") or "").strip()
    if len(desc) < 120 or len(cult) < 80 or len(craft) < 80:
        raise ValueError(f"扩写过短: {item['name']} {len(desc)}/{len(cult)}/{len(craft)}")
    item["description"] = desc
    item["cultural_meaning"] = cult
    item["craft_process"] = craft
    item["expand_version"] = TARGET_VERSION
    return True


def main() -> None:
    only = None
    if len(sys.argv) > 2 and sys.argv[1] == "--only":
        only = set(sys.argv[2].split(","))
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    todo = [
        it
        for it in items
        if it.get("expand_version", 0) < TARGET_VERSION and (only is None or it["id"] in only)
    ]
    print(f"待扩写 {len(todo)} / {len(items)}")
    from concurrent.futures import ThreadPoolExecutor, as_completed

    done = 0

    def work(it: dict) -> str:
        expand(it)
        return it["name"]

    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(work, it): it for it in todo}
        for f in as_completed(futs):
            it = futs[f]
            try:
                name = f.result()
                done += 1
                print(f"[{done}/{len(todo)}] {name}", flush=True)
                with _lock:
                    save(items)
            except Exception as e:  # noqa: BLE001
                print(f"FAIL {it['name']}: {e}", flush=True)
    print("全部完成")


if __name__ == "__main__":
    main()
