"""核心接口测试（不依赖大模型调用，可在无 API Key 环境运行）。

运行方式（在 backend/ 目录下）：
    python -m pytest tests/ -q
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client: TestClient):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "chengmai-ai"


def test_heritage_list(client: TestClient):
    resp = client.get("/api/heritage")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 24
    for it in items:
        assert {"id", "name", "category", "region", "level", "image"} <= set(it)
        assert it["image"].endswith(".jpg")


def test_heritage_detail_with_sources(client: TestClient):
    resp = client.get("/api/heritage/h_jingju")
    assert resp.status_code == 200
    d = resp.json()
    assert d["name"] == "京剧"
    assert len(d["sources"]) > 0  # 每条详情必须有来源
    assert len(d["representative_works"]) > 0
    assert d["cultural_meaning"]


def test_heritage_detail_404(client: TestClient):
    assert client.get("/api/heritage/not_exist").status_code == 404


def test_graph(client: TestClient):
    resp = client.get("/api/graph")
    assert resp.status_code == 200
    g = resp.json()
    assert len(g["nodes"]) > 50
    assert len(g["links"]) > 50


def test_graph_subgraph(client: TestClient):
    resp = client.get("/api/graph/h_suxiu")
    assert resp.status_code == 200
    g = resp.json()
    ids = [n["id"] for n in g["nodes"]]
    assert "h_suxiu" in ids


def test_knowledge_search():
    from app.knowledge.search import credibility_of, search, sources_of

    results = search("苏绣的针法有什么特点")
    assert results, "苏绣应能被检索到"
    top = results[0]
    assert top["id"] == "h_suxiu"
    assert top["score"] > 0
    srcs = sources_of(top)
    assert srcs, "检索结果必须携带来源"
    cred = credibility_of(srcs)
    assert 0.0 <= cred <= 1.0


def test_progress_record_and_profile(client: TestClient):
    uid = "u_pytest"
    for evt in [
        {"user_id": uid, "event_type": "view", "item_id": "h_suxiu", "item_name": "苏绣"},
        {"user_id": uid, "event_type": "quiz_answer", "item_name": "苏绣", "detail": {"correct": True}},
        {"user_id": uid, "event_type": "quiz_answer", "item_name": "苏绣", "detail": {"correct": False}},
        {"user_id": uid, "event_type": "learning_plan", "item_name": "苏绣"},
        {"user_id": uid, "event_type": "creation", "item_name": "京剧"},
    ]:
        resp = client.post("/api/user/progress", json=evt)
        assert resp.status_code == 200
        assert resp.json()["code"] == 0

    p = client.get(f"/api/user/profile/{uid}").json()
    assert p["stats"]["viewed_items"] == 1
    assert p["stats"]["learning_plans"] == 1
    assert p["stats"]["creations"] == 1
    assert p["quiz"]["answered"] == 2
    assert p["quiz"]["accuracy"] == 0.5
    assert p["quiz_by_topic"][0]["topic"] == "苏绣"
    assert p["interests"], "应有兴趣画像"
