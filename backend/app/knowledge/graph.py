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
