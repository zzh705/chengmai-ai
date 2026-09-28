"""非遗知识图谱构建（总文档 §9：项目-类别-地域-传承人-作品 关系网络）。"""

import json
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "structured"

# 来源节点短标签（全称太长会压垮图谱布局）
_SOURCE_LABEL = {
    "src_ihchina": "中国非遗网",
    "src_zhwiki": "维基百科",
    "src_cnfolk": "中国民俗学网",
    "src_unesco": "UNESCO",
    "src_baike": "百科资料",
}


def _strip_paren(text: str) -> str:
    """去掉括号注释，让节点标签更干净：'姚惠芬（国家级…）' → '姚惠芬'。"""
    out, depth = [], 0
    for ch in text:
        if ch in "（(":
            depth += 1
        elif ch in "）)":
            depth = max(0, depth - 1)
        elif depth == 0:
            out.append(ch)
    return "".join(out).strip()


@lru_cache(maxsize=1)
def _load_items() -> list[dict]:
    return json.loads((_DATA_DIR / "heritage_items.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _load_sources() -> dict[str, dict]:
    rows = json.loads((_DATA_DIR / "sources.json").read_text(encoding="utf-8"))
    return {row["id"]: row for row in rows}


def build_graph() -> dict:
    """构建完整图谱：{nodes, links}，D3 力导向图直接消费。"""
    nodes: dict[str, dict] = {}
    links: list[dict] = []

    def add_node(node_id: str, label: str, node_type: str, extra: dict | None = None) -> None:
        if node_id not in nodes:
            node = {"id": node_id, "label": label, "type": node_type}
            if extra:
                node["extra"] = extra
            nodes[node_id] = node

    def add_link(source: str, target: str, relation: str) -> None:
        links.append({"source": source, "target": target, "relation": relation})

    sources = _load_sources()
    for item in _load_items():
        if item.get("tier") == "index":
            continue  # 索引层不进图谱（见下方省级聚合），避免数千节点挤爆力导向图
        add_node(
            item["id"],
            item["name"],
            "heritage",
            {"category": item["category"], "region": item["region"], "level": item["level"]},
        )
        for raw in item["category"].replace("，", "·").split("·"):
            cat = raw.strip()
            if cat:
                cid = f"cat::{cat}"
                add_node(cid, cat, "category")
                add_link(item["id"], cid, "属于")
        region = _strip_paren(item["region"].split("，")[0])
        if region:
            rid = f"region::{region}"
            add_node(rid, region, "region")
            add_link(item["id"], rid, "位于")
        for person in item.get("representative_inheritors", []):
            name = _strip_paren(person)
            pid = f"person::{name}"
            add_node(pid, name, "person")
            add_link(item["id"], pid, "关联传承人")
        for work in item.get("representative_works", []):
            wname = _strip_paren(work)
            wid = f"work::{wname}"
            add_node(wid, wname, "work")
            add_link(item["id"], wid, "产生作品")
        for sid in item.get("source_ids", []):
            src = sources.get(sid, {})
            extra = None
            if src:
                extra = {
                    "title": src.get("title", ""),
                    "publisher": src.get("publisher", ""),
                    "url": src.get("url", ""),
                    "reliability": src.get("reliability_level", ""),
                }
            add_node(sid, _SOURCE_LABEL.get(sid, sid), "source", extra)
            add_link(item["id"], sid, "引用")

    # —— 索引层聚合：全国在册条目按「省级行政区 × 大类」汇入图谱 ——
    # 每省聚成一个 region 节点（带在册计数），大类节点挂全国计数，
    # 大类 → 省份连「多见于」边（取该大类在册最多的 6 省），既展示全国
    # 覆盖又不引入数千个具体项目节点。
    prov_count: dict[str, int] = {}
    pair_count: dict[tuple[str, str], int] = {}
    cat_count: dict[str, int] = {}
    for item in _load_items():
        if item.get("tier") != "index":
            continue
        prov = (item.get("province") or item.get("region", "")).split("，")[0].strip()
        cat1 = item["category"].split("·")[0].strip()
        if not prov or not cat1:
            continue
        prov_count[prov] = prov_count.get(prov, 0) + 1
        cat_count[cat1] = cat_count.get(cat1, 0) + 1
        pair_count[(cat1, prov)] = pair_count.get((cat1, prov), 0) + 1

    for prov, n in prov_count.items():
        rid = f"region::{prov}"
        if rid in nodes:
            nodes[rid].setdefault("extra", {})["total"] = str(n)
        else:
            add_node(rid, prov, "region", {"total": str(n)})
    for cat1, n in cat_count.items():
        cid = f"cat::{cat1}"
        if cid in nodes:
            nodes[cid].setdefault("extra", {})["total"] = str(n)
        else:
            add_node(cid, cat1, "category", {"total": str(n)})
    by_cat: dict[str, list[tuple[str, int]]] = {}
    for (cat1, prov), n in pair_count.items():
        by_cat.setdefault(cat1, []).append((prov, n))
    for cat1, rows in by_cat.items():
        for prov, n in sorted(rows, key=lambda x: -x[1])[:6]:
            if n >= 5:
                add_link(f"cat::{cat1}", f"region::{prov}", "多见于")

    return {"nodes": list(nodes.values()), "links": links}


def subgraph(item_id: str) -> dict:
    """取某个非遗项目的一跳子图（项目 + 其所有直接关联节点）。"""
    graph = build_graph()
    neighbors = {item_id}
    for link in graph["links"]:
        if link["source"] == item_id:
            neighbors.add(link["target"])
        if link["target"] == item_id:
            neighbors.add(link["source"])
    nodes = [n for n in graph["nodes"] if n["id"] in neighbors]
    links = [
        l for l in graph["links"] if l["source"] in neighbors and l["target"] in neighbors
    ]
    return {"nodes": nodes, "links": links}
