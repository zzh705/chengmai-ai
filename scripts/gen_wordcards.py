"""层3保底配图：为每一项生成程序纹样字卡 SVG（{id}.gen.svg）。

真实照片（Wikimedia Commons，层1/2）优先；没有照片的条目由 Cover 逐级回退到
本脚本生成的字卡，再回退渐变占位。字卡不署名人名、不含伪造信息，只有
项目名/大类/地域/朝代 + 程序生成的传统纹样（回纹、挑花格、旋纹、水纹、云纹）。

用法: python3 scripts/gen_wordcards.py [--limit N]
"""

import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ITEMS = ROOT / "data" / "structured" / "heritage_items.json"
OUT_DIR = ROOT / "frontend" / "public" / "images" / "heritage"

W, H = 600, 800
GOLD = "#c9a86a"
FONT = "'Songti SC','Noto Serif SC','STSong',serif"


def mulberry32(seed: int):
    a = seed & 0xFFFFFFFF

    def rnd() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rnd


def seed_of(iid: str) -> int:
    h = 2166136261
    for c in iid:
        h ^= ord(c)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def motif_fret(rnd) -> str:
    """回纹横条：上下两条回字纹带。"""
    parts = []
    for y0 in (150, 640):
        x = 40
        while x < W - 60:
            s = 14 + int(rnd() * 10)
            parts.append(
                f'<path d="M{x} {y0} h{s} v{s} h-{s * 2 // 3} v-{s // 2} h{s // 3}"/>'
            )
            x += s + 8
    return "\n".join(parts)


def motif_lattice(rnd) -> str:
    """挑花格：斜向网格 + 十字点。"""
    parts = []
    step = 58
    for gy in range(-1, H // step + 2):
        for gx in range(-1, W // step + 2):
            x, y = gx * step, gy * step
            parts.append(f'<path d="M{x - 7} {y} h14 M{x} {y - 7} v14"/>')
            if (gx + gy) % 3 == 0:
                parts.append(f'<path d="M{x - 5} {y - 5} l10 10 M{x + 5} {y - 5} l-10 10"/>')
    return "\n".join(parts)


def motif_rings(rnd) -> str:
    """旋纹：随机位置的同心圆簇（陶轮意象）。"""
    parts = []
    for _ in range(6):
        cx = int(60 + rnd() * (W - 120))
        cy = int(90 + rnd() * (H - 180))
        for k in range(3, 8):
            r = k * 13 + int(rnd() * 5)
            dash = ' stroke-dasharray="6 9"' if rnd() < 0.35 else ""
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"{dash}/>')
    return "\n".join(parts)


def motif_waves(rnd) -> str:
    """水纹：层叠正弦线。"""
    parts = []
    y0 = 120
    while y0 < H - 90:
        amp = 7 + rnd() * 8
        seg = 60
        d = f"M-20 {y0}"
        x = -20
        up = True
        while x < W + 40:
            d += f" q {seg // 2} {-amp if up else amp} {seg} 0"
            x += seg
            up = not up
        parts.append(f'<path d="{d}"/>')
        y0 += 44
    return "\n".join(parts)


def motif_clouds(rnd) -> str:
    """云纹：行云卷草短线。"""
    parts = []
    for row, y in enumerate(range(130, H - 80, 70)):
        x = 30 + (row % 2) * 34
        while x < W - 40:
            s = 16 + int(rnd() * 12)
            parts.append(
                f'<path d="M{x} {y} h{s} a{s // 3} {s // 3} 0 1 0 0 {s // 2} '
                f'a{s // 4} {s // 4} 0 1 1 -{s // 2} 0"/>'
            )
            x += s + 30
    return "\n".join(parts)


MOTIFS = {
    "fret": motif_fret,
    "lattice": motif_lattice,
    "rings": motif_rings,
    "waves": motif_waves,
    "clouds": motif_clouds,
}


def pick_motif(category: str) -> str:
    if re.search(r"绣|织|编|锦|毯", category):
        return "lattice"
    if re.search(r"陶|瓷|漆|雕|器", category):
        return "rings"
    if re.search(r"剪|纸|年画|皮影|灯|彩扎", category):
        return "lattice"
    if re.search(r"茶|酒|饮食|医药|炮制", category):
        return "waves"
    if re.search(r"戏|曲|舞|音乐|游艺|体育|俗", category):
        return "clouds"
    return "fret"


def split_name(name: str) -> list[str]:
    n = len(name)
    if n <= 4:
        return [name]
    if n <= 6:
        return [name]
    cut = (n + 1) // 2
    return [name[:cut], name[cut:]]


def build_svg(item: dict) -> str:
    rnd = mulberry32(seed_of(item["id"]))
    motif = MOTIFS[pick_motif(item.get("category") or "")](rnd)
    name_lines = split_name(item["name"])
    name_svg = []
    if len(name_lines) == 1:
        size = 76 if len(name_lines[0]) <= 4 else 64
        name_svg.append(
            f'<text x="300" y="418" text-anchor="middle" font-size="{size}" '
            f'fill="#eadfc4" letter-spacing="6">{esc(name_lines[0])}</text>'
        )
    else:
        name_svg.append(
            f'<text x="300" y="396" text-anchor="middle" font-size="56" '
            f'fill="#eadfc4" letter-spacing="6">{esc(name_lines[0])}</text>'
        )
        name_svg.append(
            f'<text x="300" y="466" text-anchor="middle" font-size="56" '
            f'fill="#eadfc4" letter-spacing="6">{esc(name_lines[1])}</text>'
        )
    meta_y = 512 if len(name_lines) > 1 else 470
    region = item.get("region") or ""
    era = item.get("era") or ""
    meta = " · ".join(x for x in (region, era) if x)
    first_char = esc(item["name"][:1])
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <radialGradient id="vg" cx="0.5" cy="0.42" r="0.75">
    <stop offset="0" stop-color="#241d15" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#14100c" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="#15110d"/>
<rect width="{W}" height="{H}" fill="url(#vg)"/>
<g fill="none" stroke="{GOLD}" stroke-width="1.6" opacity="0.07" stroke-linecap="round">
{motif}
</g>
<g fill="none" stroke="#a08a52" opacity="0.55" stroke-width="1.6">
  <rect x="20" y="20" width="{W - 40}" height="{H - 40}"/>
</g>
<g fill="none" stroke="#a08a52" opacity="0.22" stroke-width="1">
  <rect x="30" y="30" width="{W - 60}" height="{H - 60}"/>
</g>
<g fill="none" stroke="#a08a52" opacity="0.7" stroke-width="2" stroke-linejoin="miter">
  <path d="M44 74 V44 H74 M52 74 V52 H74"/>
  <path d="M{W - 44} 74 V44 H{W - 74} M{W - 52} 74 V52 H{W - 74}"/>
  <path d="M44 {H - 74} V{H - 44} H74 M52 {H - 74} V{H - 52} H74"/>
  <path d="M{W - 44} {H - 74} V{H - 44} H{W - 74} M{W - 52} {H - 74} V{H - 52} H{W - 74}"/>
</g>
<text x="300" y="470" text-anchor="middle" font-family="{FONT}" font-size="380"
  fill="#e8dcc0" opacity="0.05">{first_char}</text>
<text x="300" y="132" text-anchor="middle" font-family="{FONT}" font-size="22"
  fill="#9a8a66" letter-spacing="8">{esc(item.get('category') or '')}</text>
<g font-family="{FONT}">
{chr(10).join(s.replace('<text ', '<text font-family="' + FONT + '" ') for s in name_svg)}
<text x="300" y="{meta_y}" text-anchor="middle" font-size="24" fill="#8f7f5c"
  letter-spacing="4">{esc(meta)}</text>
</g>
<g transform="translate(276 668)">
  <rect width="48" height="76" rx="6" fill="#9e3b2c"/>
  <text x="24" y="34" text-anchor="middle" font-family="{FONT}" font-size="26"
    fill="#f5ead8">承</text>
  <text x="24" y="66" text-anchor="middle" font-family="{FONT}" font-size="26"
    fill="#f5ead8">脉</text>
</g>
</svg>
"""


def main() -> None:
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    n = 0
    for it in items:
        svg = build_svg(it)
        (OUT_DIR / f"{it['id']}.gen.svg").write_text(svg, encoding="utf-8")
        n += 1
        if limit and n >= limit:
            break
    print(f"生成纹样字卡 {n} 张 → {OUT_DIR}", flush=True)


if __name__ == "__main__":
    main()
