"""层3 配图（真图版）：DashScope 通义万相 wanx2.1-t2i-turbo 为缺图条目生成写实示意图。

为什么是它：层1/2（Wikimedia Commons / Openverse 实拍）三轮抓取后仍有 735 项长尾
无靠谱实拍（严格相关性门下宁缺毋滥）。万相生成的「匠人双手 + 器物 + 工坊暖光」
纪实风与现有实拍视觉统一，且无水印、国内直连、中文语义准。

诚实分层：本层图片在 credits.json 中 source="dashscope-wanx-ai"，
license 标注「AI 生成示意图」，About 页许可声明同步如实说明，不冒充实拍。

prompt 纪律：以器物 / 双手 / 场景为主，侧影、背影、远景或局部特写，
避开清晰人脸（AI 人脸易崩），无文字无水印；按十大类切换镜头模板。

落盘：下载 PNG → sips 转 jpeg（长边 900、q82，与实拍管线一致）→ {id}.jpg

用法:
  python3 scripts/gen_images_wanx.py --limit 8        # 小批试跑
  python3 scripts/gen_images_wanx.py                  # 全量（断点续传）
  python3 scripts/gen_images_wanx.py --workers 4
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "frontend" / "public" / "images" / "heritage"
ITEMS = ROOT / "data" / "structured" / "heritage_items.json"
STATE_F = ROOT / "data" / "structured" / "img_state_wanx.json"
CREDITS = IMG_DIR / "credits.json"
ENV = ROOT / ".env"

API_SUBMIT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
API_TASK = "https://dashscope.aliyuncs.com/api/v1/tasks/{}"
MODEL = "wanx2.1-t2i-turbo"
SIZE = "1280*720"

_lock = threading.Lock()
_tls = threading.local()

# 免费额度护栏：wanx2.1-t2i-turbo 官方免费额度 500 张/账号。
# 只在免费额度内生成——任何疑似配额耗尽/欠费信号立即全局熔断，绝不产生扣费。
FREE_QUOTA_TOTAL = 500
stop_event = threading.Event()
QUOTA_HINTS = (
    "insufficientquota", "quotaexhausted", "freequota", "exceededquota",
    "arrearage", "quota exceeded", "free quota", "额度", "欠费", "余额",
)


def _is_quota_error(code: int, body: str) -> bool:
    """识别配额/欠费类错误（区别于普通限流重试）。"""
    low = body.lower()
    if any(h in low for h in QUOTA_HINTS):
        return True
    # 无任何付费开通时，额度耗尽常以 403 返回
    return code == 403 and "throttl" not in low

PROVINCES = (
    "北京|天津|上海|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|"
    "湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆|香港|澳门"
)
PROV_RE = re.compile(f"({PROVINCES})")
ETHNIC_RE = re.compile(
    r"(蒙古族|藏族|维吾尔族|苗族|彝族|壮族|布依族|朝鲜族|满族|侗族|瑶族|白族|土家族|哈尼族|"
    r"哈萨克族|傣族|黎族|傈僳族|佤族|畲族|高山族|拉祜族|水族|东乡族|纳西族|景颇族|柯尔克孜族|"
    r"土族|达斡尔族|仫佬族|羌族|布朗族|撒拉族|毛南族|仡佬族|锡伯族|阿昌族|普米族|塔吉克族|"
    "怒族|乌孜别克族|俄罗斯族|鄂温克族|德昂族|保安族|裕固族|京族|塔塔尔族|独龙族|鄂伦春族|"
    "赫哲族|门巴族|珞巴族|基诺族|回族)"
)

# 统一的视觉纪律后缀：写实、暖光、无文字水印、规避面部崩坏
TAIL = "写实纪实摄影风格，温暖自然光，浅景深，高细节质感，画面中不要出现任何文字、字母、标识、水印，不要清晰人脸特写"

# 十大类镜头模板。{name}=项目名，{place}=地域氛围短语
TEMPLATES = {
    "民间文学": (
        "中国非遗民间叙事《{name}》，木楞老屋火塘边，白发老艺人的背影手持手抄长卷低声吟唱，"
        "墙上挂着民族乐器，桌边一盏油灯，温暖昏暗的光线与升腾的烟气，空镜叙事感，画面中不出现孩童正脸"
    ),
    "传统音乐": (
        "中国非遗{name}，传统民族乐器演奏特写，乐手身着民族服饰的侧影，手指在琴弦上的动作，"
        "{place}，柔和光线"
    ),
    "传统舞蹈": (
        "中国非遗{name}民间舞蹈，中国乡村庙会晒谷场上，舞者穿中国传统红绿彩衣舞动红绸、"
        "腰鼓、花伞或龙灯道具，全景远景镜头，逆光中的人群剪影与动态模糊，红灯笼高悬，胶片颗粒质感"
    ),
    "传统戏剧": (
        "中国非遗{name}戏曲舞台，演员以传统戏曲浓妆脸谱亮相（程式化妆容），华丽刺绣戏服与"
        "盔头翎子的局部特写，水袖身段侧影，戏台宫灯与守旧背景虚化，暖红舞台光"
    ),
    "曲艺": (
        "中国非遗{name}曲艺表演，艺人手持鼓板或拉弦乐器坐唱的侧影，面部隐在阴影中，"
        "传统茶馆书场里木桌茶壶与醒木，暖色灯光"
    ),
    "传统美术": (
        "中国非遗{name}，匠人双手正在创作的特写，半成品、传统工具与天然材料铺陈在案头，"
        "{place}老作坊，窗格自然光"
    ),
    "传统技艺": (
        "中国非遗{name}传统手工技艺，匠人双手操作传统器具的工坊场景，原料与工序细节清晰，"
        "{place}，蒸汽与暖色光"
    ),
    "传统医药": (
        "中国非遗{name}，传统中医药房场景，草本药材、戥秤、老药柜瓷罐与砂锅的特写，"
        "老药工称量药材的双手（不入面部），温暖光线"
    ),
    "民俗": (
        "中国非遗{name}传统民俗节庆，{place}古镇乡村里张灯结彩、民众欢聚的远景与节俗道具特写"
        "（红灯笼、香案、龙舟、舞狮），红金喜庆色调，烟火气，全景构图"
    ),
    "传统体育、游艺与杂技": (
        "中国非遗{name}，中国传统杂技团艺人在中式古戏台或红绸马戏大棚里表演，"
        "身着中式对襟彩衣，远景抓拍空中翻腾与叠罗汉的动作瞬间，逆光剪影感，台下灯笼暖光"
    ),
}
DEFAULT_TPL = TEMPLATES["传统技艺"]


def load_key() -> str:
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("LLM_API_KEY="):
            return line.strip().split("=", 1)[1]
    raise RuntimeError(".env 缺少 LLM_API_KEY")


def opener() -> urllib.request.OpenerDirector:
    op = getattr(_tls, "op", None)
    if op is None:
        op = urllib.request.build_opener()
        op.addheaders = [("User-Agent", "chengmai-ai/1.0")]
        _tls.op = op
    return op


def http(method: str, url: str, key: str, body: dict | None = None, timeout: int = 60) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bearer {key}")
    r.add_header("Content-Type", "application/json")
    if body is not None:
        r.add_header("X-DashScope-Async", "enable")
    with opener().open(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def place_phrase(item: dict) -> str:
    region = item.get("region") or ""
    name = item.get("name") or ""
    eth = ETHNIC_RE.search(name + region)
    m = PROV_RE.search(region)
    bits = []
    if eth:
        bits.append(eth.group(1))
    if m:
        p = m.group(1)
        if p not in ("北京", "天津", "上海", "重庆"):
            p = p.rstrip("省")
        bits.append(p)
    if not bits:
        return "中国乡土"
    return "".join(dict.fromkeys(bits))


def build_prompt(item: dict) -> str:
    cat = (item.get("category") or "").split("·")[0].strip()
    tpl = TEMPLATES.get(cat, DEFAULT_TPL)
    place = place_phrase(item)
    # 地域性布景：草原/高原/江南等给模型空间锚点
    scene = place
    if "内蒙古" in place:
        scene = place + "草原蒙古包"
    elif "西藏" in place or "青海" in place:
        scene = place + "高原"
    elif "新疆" in place:
        scene = place + "绿洲巴扎"
    elif any(p in place for p in ("云南", "贵州", "广西")):
        scene = place + "山寨"
    core = tpl.format(name=item["name"], place=scene)
    return f"{core}，{TAIL}"


def load_state() -> dict:
    if STATE_F.exists():
        return json.loads(STATE_F.read_text(encoding="utf-8"))
    return {}


def save_state(st: dict) -> None:
    tmp = STATE_F.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(STATE_F)


def to_jpg(png_path: pathlib.Path, out: pathlib.Path) -> bool:
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "900",
         str(png_path), "--out", str(out)],
        check=True, capture_output=True,
    )
    return out.exists() and out.stat().st_size >= 12 * 1024


def credit(iid: str, item: dict, prompt: str) -> None:
    with _lock:
        credits = json.loads(CREDITS.read_text(encoding="utf-8"))
        credits[iid] = {
            "license": "AI 生成示意图（Alibaba Cloud 通义万相 wanx2.1-t2i-turbo）",
            "term": prompt,
            "title": item["name"],
            "source": "dashscope-wanx-ai",
            "landing": "https://dashscope.aliyuncs.com/",
        }
        CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")


def gen_one(item: dict, key: str, st: dict) -> str:
    """返回 done / failed；自带一次整链路重试。"""
    iid = item["id"]
    prompt = build_prompt(item)
    raw = IMG_DIR / f"_wanx_{iid}.png"
    for attempt in range(2):
        try:
            r = http("POST", API_SUBMIT, key,
                     {"model": MODEL, "input": {"prompt": prompt},
                      "parameters": {"size": SIZE, "n": 1, "prompt_extend": True}})
            tid = r["output"]["task_id"]
            with _lock:
                st[iid] = {"status": "running", "task_id": tid, "prompt": prompt}
                save_state(st)
            for _ in range(40):  # 最多 ~120s
                time.sleep(3)
                j = http("GET", API_TASK.format(tid), key)
                status = j["output"]["task_status"]
                if status == "SUCCEEDED":
                    url = j["output"]["results"][0]["url"]
                    raw.write_bytes(urllib.request.urlopen(url, timeout=90).read())
                    out = IMG_DIR / f"{iid}.jpg"
                    if not to_jpg(raw, out):
                        raise RuntimeError("jpg convert too small")
                    raw.unlink(missing_ok=True)
                    credit(iid, item, prompt)
                    with _lock:
                        st[iid] = {"status": "done", "prompt": prompt}
                        save_state(st)
                    return "done"
                if status == "FAILED":
                    raise RuntimeError(j["output"].get("message", "task failed"))
                # PENDING / RUNNING 继续轮询
            raise RuntimeError("poll timeout")
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if _is_quota_error(e.code, msg):
                # 配额/欠费信号：全局熔断，不再提交任何新任务
                stop_event.set()
                with _lock:
                    st[iid] = {"status": "failed", "error": f"QUOTA {e.code} {msg[:160]}", "prompt": prompt}
                    save_state(st)
                print(f"  ⛔ 触发免费额度护栏（HTTP {e.code}），全局停止，不再扣费", flush=True)
                return "quota"
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(8 * (attempt + 1))
                continue
            with _lock:
                st[iid] = {"status": "failed", "error": f"HTTP {e.code} {msg}", "prompt": prompt}
                save_state(st)
            return "failed"
        except Exception as e:  # noqa: BLE001
            if attempt == 0:
                time.sleep(5)
                continue
            with _lock:
                st[iid] = {"status": "failed", "error": f"{type(e).__name__}: {e}"[:200], "prompt": prompt}
                save_state(st)
            return "failed"
    return "failed"


def main() -> None:
    key = load_key()
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    workers = 4
    if "--workers" in sys.argv:
        workers = int(sys.argv[sys.argv.index("--workers") + 1])

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    todo = [i for i in items if not (IMG_DIR / f"{i['id']}.jpg").exists()]
    if only:
        todo = [i for i in todo if i["id"] in only]
    if limit is not None:
        todo = todo[:limit]

    st = load_state()
    # 重跑仅针对未落盘且非 done 的条目
    todo = [i for i in todo if st.get(i["id"], {}).get("status") != "done"]

    # —— 免费额度护栏：以 credits.json 中已成功的万相图为已用量口径 ——
    used = 0
    if CREDITS.exists():
        credits = json.loads(CREDITS.read_text(encoding="utf-8"))
        used = sum(1 for v in credits.values() if v.get("source") == "dashscope-wanx-ai")
    budget = FREE_QUOTA_TOTAL - used
    if budget <= 0:
        print(f"免费额度已用完（{used}/{FREE_QUOTA_TOTAL}），停止，不产生任何扣费。", flush=True)
        return
    if len(todo) > budget:
        print(f"免费额度剩余 {budget} 张；{len(todo) - budget} 项超出额度，"
              f"本次不生成（将在知识库沉底）。", flush=True)
        todo = todo[:budget]
    print(f"待生成 {len(todo)} 项（额度 {used}/{FREE_QUOTA_TOTAL}，本次封顶 {budget}），"
          f"workers={workers} model={MODEL}", flush=True)

    stats = {"done": 0, "failed": 0, "quota": 0, "skipped": 0}
    slot_lock = threading.Lock()
    next_slot = [0.0]

    def worker(it: dict) -> None:
        if stop_event.is_set():
            stats["skipped"] += 1
            return
        # 提交限流：同账号提交 QPS 安全线 ~0.9/s（错开 1.1s）
        with slot_lock:
            wait = next_slot[0] - time.monotonic()
            next_slot[0] = max(time.monotonic(), next_slot[0]) + 1.1
        if wait > 0:
            time.sleep(wait)
        if stop_event.is_set():
            stats["skipped"] += 1
            return
        res = gen_one(it, key, st)
        if res in stats:
            stats[res] += 1
        if res == "quota":
            return
        tag = "✓" if res == "done" else "✗"
        print(f"  {tag} {it['id']} {it['name'][:24]} [{stats['done']}/{stats['failed']}]", flush=True)

    from concurrent.futures import ThreadPoolExecutor, as_completed
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(worker, it) for it in todo]
        for n, f in enumerate(as_completed(futs), 1):
            f.result()
            if stop_event.is_set():
                print("⛔ 额度护栏已触发，取消所有排队任务。", flush=True)
                for fx in futs:
                    fx.cancel()
                break
            if n % 25 == 0:
                print(f"--- 进度 {n}/{len(todo)} 成功 {stats['done']} 失败 {stats['failed']}", flush=True)
    print(f"完成：成功 {stats['done']}，失败 {stats['failed']}，"
          f"护栏跳过 {stats['skipped']}", flush=True)


if __name__ == "__main__":
    main()
