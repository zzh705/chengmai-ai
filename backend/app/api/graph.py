# ============================================================
# 【承脉 AI · 原创代码】追光小队自研，非框架/非第三方代码
# 原创点：非遗族谱接口：大类-项目-地域-传承人关系网络的数据装配
# ============================================================
"""知识图谱接口：GET /api/graph 与 GET /api/graph/{id}。"""

from fastapi import APIRouter, HTTPException

from app.knowledge.graph import build_graph, subgraph
from app.schemas.graph import GraphResponse

router = APIRouter(prefix="/api", tags=["graph"])


@router.get("/graph", response_model=GraphResponse)
def full_graph() -> GraphResponse:
    """完整图谱（节点+关系），供图谱总览页渲染。"""
    return GraphResponse(**build_graph())


@router.get("/graph/{item_id}", response_model=GraphResponse)
def item_graph(item_id: str) -> GraphResponse:
    """单个非遗项目的一跳子图。"""
    graph = subgraph(item_id)
    if not graph["nodes"]:
        raise HTTPException(status_code=404, detail=f"项目不存在: {item_id}")
    return GraphResponse(**graph)
