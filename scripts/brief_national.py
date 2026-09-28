"""全国名录批量入库：为 ihchina 全量条目生成简 brief（LLM），并合并进知识库。

流程（幂等，可断点续传）：
1. 读 national_raw.json（已按 name+province 去重）；
2. 与现有深读项目按名称精确去重；
3. 按 project_num 罗马数字映射官方十大类，归一省级地域；
4. 分批调用 LLM 生成 era/hook/description/cultural_meaning/craft_process，
   写入 national_briefs.json（按 ihchina id 断点续传）；
5. 全部完成后合并进 heritage_items.json（tier='index'，末尾追加，保留深读顺序）。

用法: python3 scripts/brief_national.py [--merge-only]
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

RAW = ROOT / "data" / "structured" / "national_raw.json"
BRIEFS = ROOT / "data" / "structured" / "national_briefs.json"
ITEMS = ROOT / "data" / "structured" / "heritage_items.json"

CAT_BY_ROMAN = {
    "Ⅰ": "民间文学",
    "Ⅱ": "传统音乐",
    "Ⅲ": "传统舞蹈",
    "Ⅳ": "传统戏剧",
    "Ⅴ": "曲艺",
    "Ⅵ": "传统体育、游艺与杂技",
    "Ⅶ": "传统美术",
    "Ⅷ": "传统技艺",
    "Ⅸ": "传统医药",
    "Ⅹ": "民俗",
}

# 旧式「Ⅰ-XXXX-序号」编码只出现在第一批名录，罗马字母恒为 Ⅰ 而非真实大类，
# 需按 reg_type（工艺门类）折算回官方十大类。
CAT_BY_REG_TYPE = {
    1: "传统美术",  # 刺绣
    2: "传统技艺",  # 服饰制作
    3: "传统美术",  # 风筝扎制
    4: "传统美术",  # 玉石雕刻
    5: "传统技艺",  # 家具建筑
    6: "传统技艺",  # 金工
    7: "传统美术",  # 剪纸刻绘
    8: "传统技艺",  # 陶瓷烧制
    9: "传统技艺",  # 文房用品
    10: "传统技艺",  # 漆器髹饰
    11: "传统技艺",  # 印刷制版
    12: "传统技艺",  # 食品制作
    13: "传统医药",  # 中药炮制
    14: "传统技艺",  # 乐器制作
}

PROV_PREFIXES = [
    "内蒙古自治区",
    "广西壮族自治区",
    "西藏自治区",
    "宁夏回族自治区",
    "新疆维吾尔自治区",
    "香港特别行政区",
    "澳门特别行政区",
    "北京市",
    "天津市",
    "上海市",
    "重庆市",
    "河北省",
    "山西省",
    "辽宁省",
    "吉林省",
    "黑龙江省",
    "江苏省",
    "浙江省",
    "安徽省",
    "福建省",
    "江西省",
    "山东省",
    "河南省",
    "湖北省",
    "湖南省",
    "广东省",
    "海南省",
    "四川省",
    "贵州省",
    "云南省",
    "陕西省",
    "甘肃省",
    "青海省",
    "台湾省",
]
_SHORT = ["内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门"]


def top_province(region: str) -> str:
    """'浙江省杭州市' → '浙江省'；'广西南宁市' → '广西壮族自治区' 归一失败则退化短名。"""
    head = region.split("，")[0].strip()
    for p in PROV_PREFIXES:
        if head.startswith(p):
            return p
    for s in _SHORT:
        if head.startswith(s):
            return s
    return head


SYSTEM = (
    "你是「承脉AI」的非遗内容编审。写作准确、克制、具体；"
    "只写你确知的事实或基于名称与地域的稳妥概述，不编造人名、年份、奖项；"
    "不确定的字段用空字符串。不用 emoji，不用 Markdown。"
)

PROMPT = """下列是国家级非物质文化遗产名录中的项目（名称 / 省级地域 / 官方大类）：
{rows}

请为每一项生成简 brief，严格返回 JSON 数组（长度与输入一致，按顺序）：
[
  {{
    "id": "原样返回 id",
    "era": "时代概述（如“清代形成”，不确知填 ""）",
    "hook": "14~22 字一句话钩子",
    "description": "90~150 字简介：流传地域 + 是什么 + 特点",
    "cultural_meaning": "50~90 字文化内涵",
    "craft_process": "40~90 字主要工序/流程（民俗节庆等无工艺填 ""）"
  }}
]"""

_lock = threading.Lock()


def load_briefs() -> dict:
    if BRIEFS.exists():
        return json.loads(BRIEFS.read_text(encoding="utf-8"))
    return {}


def save_briefs(briefs: dict) -> None:
    tmp = BRIEFS.with_suffix(".tmp")
    tmp.write_text(json.dumps(briefs, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(BRIEFS)


def gen_batch(rows: list[dict]) -> None:
    lines = "\n".join(
        f"{r['id']} | {r['name']} | {r['province']} | {r['category']}" for r in rows
    )
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            out = chat(PROMPT.format(rows=lines), system=SYSTEM, temperature=0.4)
            text = strip_emoji(out)
            match = re.search(r"\[.*\]", text, re.S)
            if not match:
                raise ValueError("未返回 JSON 数组")
            arr = json.loads(match.group(0))
            got = {str(x.get("id")): x for x in arr if isinstance(x, dict)}
            briefs = load_briefs()
            n = 0
            for r in rows:
                b = got.get(r["id"])
                if not b:
                    continue
                desc = (b.get("description") or "").strip()
                hook = (b.get("hook") or "").strip()
                if len(desc) < 50 or not hook:
                    continue
                briefs[r["id"]] = {
                    "era": (b.get("era") or "").strip(),
                    "hook": hook,
                    "description": desc,
                    "cultural_meaning": (b.get("cultural_meaning") or "").strip(),
                    "craft_process": (b.get("craft_process") or "").strip(),
                }
                n += 1
            if n == 0:
                raise ValueError("全部行无效")
            with _lock:
                save_briefs(briefs)
            return
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"批次失败: {last_err}")


def item_category(row: dict) -> str:
    """条目大类：标准编码取罗马字母，旧式 Ⅰ-XXXX 编码取 reg_type 门类。"""
    num = row.get("project_num") or ""
    if re.match(r"^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]-[A-Z]{4}-", num):
        return CAT_BY_REG_TYPE.get(int(row.get("reg_type") or 0), "传统技艺")
    return CAT_BY_ROMAN.get(num[0], "民俗")


def build_skeletons() -> tuple[list[dict], dict[str, dict]]:
    """返回 (待补 brief 的行, id→骨架)。同名条目折叠为一条，标准编码优先。"""
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    deep_names = {i["name"] for i in items}

    # 按名称折叠（京剧 ×9 为同一项目按申报地区分列），标准编码行优先
    by_name: dict[str, list[dict]] = {}
    for r in raw:
        by_name.setdefault(r["name"], []).append(r)

    skel: dict[str, dict] = {}
    todo: list[dict] = []
    for name, rows in by_name.items():
        if name in deep_names:
            continue
        rows_sorted = sorted(
            rows,
            key=lambda r: 0
            if re.match(r"^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]-\d+_", r.get("project_num") or "")
            else 1,
        )
        pick = rows_sorted[0]
        provs: list[str] = []
        for r in rows_sorted:
            p = top_province(r.get("province") or "")
            if p and p not in provs:
                provs.append(p)
        if not provs:
            continue
        prov = provs[0]
        detail = "，".join(p for p in (r.get("province") or "" for r in rows_sorted) if p)
        row_id = f"h_n{pick['id']}"
        skel[row_id] = {
            "id": row_id,
            "name": name,
            "category": item_category(pick),
            "region": prov,
            "province": prov,
            "region_detail": detail[:200],
            "era": "",
            "level": "国家级非物质文化遗产",
            "description": "",
            "cultural_meaning": "",
            "craft_process": "",
            "hook": "",
            "representative_works": [],
            "representative_inheritors": [],
            "fun_facts": [],
            "wow_numbers": [],
            "story": "",
            "timeline": [],
            "tier": "index",
            "source": "文化和旅游部中国非物质文化遗产网 · 名录条目（AI 简述）",
            "project_num": (pick.get("project_num") or "").strip(),
        }
        todo.append({"id": row_id, "name": name, "province": prov, "category": skel[row_id]["category"]})
    return todo, skel


def merge(skel: dict[str, dict], briefs: dict) -> tuple[int, int]:
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    have = {i["id"] for i in items}
    added = 0
    for iid, base in skel.items():
        if iid in have or iid not in briefs:
            continue
        base.update(briefs[iid])
        base["brief_v"] = 1
        items.append(base)
        added += 1
    tmp = ITEMS.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(ITEMS)
    return added, len(items)


def main() -> None:
    merge_only = "--merge-only" in sys.argv
    todo, skel = build_skeletons()
    briefs = load_briefs()
    pending = [r for r in todo if r["id"] not in briefs]
    print(f"待生成 {len(pending)} / 候选 {len(todo)}（已跳过深读同名项）", flush=True)

    if not merge_only and pending:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        BATCH = 10
        batches = [pending[i : i + BATCH] for i in range(0, len(pending), BATCH)]
        done = 0
        with ThreadPoolExecutor(max_workers=5) as ex:
            futs = {ex.submit(gen_batch, b): b for b in batches}
            for f in as_completed(futs):
                batch = futs[f]
                try:
                    f.result()
                    done += 1
                    if done % 5 == 0:
                        print(f"[{done}/{len(batches)}] 批", flush=True)
                except Exception as e:  # noqa: BLE001
                    names = "、".join(r["name"] for r in batch)
                    print(f"FAIL 批({names[:60]}…): {e}", flush=True)
            print("线程池结束", flush=True)
        briefs = load_briefs()
        print(f"brief 完成 {len(briefs)}", flush=True)

    briefs = load_briefs()
    missing = [r for r in todo if r["id"] not in briefs]
    if missing and not merge_only:
        print(f"仍有 {len(missing)} 项缺 brief，跳过合并", flush=True)
        return
    added, total = merge(skel, briefs)
    print(f"合并新增 {added}，当前共 {total} 项", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback

        traceback.print_exc()
        sys.exit(1)
