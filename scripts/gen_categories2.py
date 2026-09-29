#!/usr/bin/env python3
"""二轮类目提名：LLM 生成 Commons 分类候选 → API 批量验真（categoryinfo）
→ 只保留确实存在的，写入 data/structured/commons_categories2.json。

用法：backend/.venv/bin/python -u scripts/gen_categories2.py [--n 400]
"""
from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

OUT = ROOT / "data/structured/commons_categories2.json"
EXISTING = ROOT / "data/structured/commons_categories.json"
API = "https://commons.wikimedia.org/w/api.php"

N = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 400


def load_env() -> dict:
    env = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def llm(prompt: str) -> str:
    import urllib.request

    env = load_env()
    base = (env.get("LLM_BASE_URL") or "https://dashscope.aliyuncs.com/compatible-mode/v1").rstrip("/")
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(
            {
                "model": env.get("LLM_MODEL") or "qwen-plus",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }
        ).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {env['LLM_API_KEY']}",
        },
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.loads(r.read().decode())
    return data["choices"][0]["message"]["content"]


def verify(names: list[str]) -> list[str]:
    """批量验真：只留 Commons 上真实存在的分类。"""
    import sys as _sys

    from fetch_images_v3 import _get

    ok: list[str] = []
    for i in range(0, len(names), 50):
        batch = names[i : i + 50]
        q = urllib.parse.urlencode(
            {
                "action": "query",
                "titles": "|".join(f"Category:{n}" for n in batch),
                "prop": "categoryinfo",
                "format": "json",
            }
        )
        try:
            data = json.loads(_get(f"{API}?{q}").decode())
        except Exception as e:  # noqa: BLE001
            print(f"  验真批次失败 {type(e).__name__}，跳过 {len(batch)} 个", flush=True)
            continue
        pages = (data.get("query") or {}).get("pages") or {}
        for p in pages.values():
            if "categoryinfo" in p and p.get("title", "").startswith("Category:"):
                ok.append(p["title"][len("Category:") :])
        _sys.stdout.write(f"\r  已验 {min(i + 50, len(names))}/{len(names)}，存在 {len(ok)}")
        _sys.stdout.flush()
    print(flush=True)
    return ok


def main() -> None:
    existing = json.loads(EXISTING.read_text(encoding="utf-8"))
    prompt = (
        f"你在为「中国非物质文化遗产」图片库挑选 Wikimedia Commons 英文分类（Category names）。\n"
        f"只列你确信 Commons 上真实存在、且有一定规模的分类名（不含 Category: 前缀），"
        f"每行一个，共 {N} 个。要求：\n"
        "1. 主题围绕中国传统/民族手工艺、表演艺术、节庆、饮食技艺、中医药、体育游艺；\n"
        "2. 优先大类与子类混合：如 Chinese paper cutting、Chinese dance、"
        "Nianhua、Chinese shadow puppetry、Chinese kites、Chinese incense、"
        "provincial/ethnic specific crafts（如 Suzhou embroidery、Dongyang wood carving、"
        "Miao people、Dong people、Uyghur music）；\n"
        "3. 不要照片/文件类页（File:）、不要人物传记页、不要非常冷门到可能不存在的合成词；\n"
        f"4. 不要这些已存在列表里的：{json.dumps(existing[:0])}（整表校验时会自动去重）；\n"
        "5. 只输出纯文本行列表，不要编号、不要解释、不要代码块。"
    )
    print(f"LLM 提名 {N} 个…", flush=True)
    raw = llm(prompt)
    names: list[str] = []
    for line in raw.splitlines():
        line = line.strip().lstrip("-*•").strip()
        line = line.removeprefix("Category:").strip()
        if line and " " in line or (line.isascii() and len(line) > 3):
            names.append(line)
    names = list(dict.fromkeys(names))
    print(f"解析 {len(names)} 个候选，API 验真…", flush=True)
    ok = verify(names)
    ok = [n for n in ok if n not in set(existing)]
    print(f"新且真实存在：{len(ok)}", flush=True)
    if ok:
        prev = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
        merged = list(dict.fromkeys(prev + ok))
        OUT.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"写入 {OUT}（累计 {len(merged)}）", flush=True)


if __name__ == "__main__":
    main()
