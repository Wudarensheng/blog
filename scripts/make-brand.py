"""从真实头像派生品牌素材：头像各尺寸、favicon、社交卡片图。

全部按 DESIGN.md 的规则绘制：纯平色，不含任何渐变。
源图是 public/avatar.jpg（从站长的 QQ 头像地址下载的 1080×1080 原图）。

    python scripts/make-brand.py
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "avatar.jpg"

# 橙色系三站
AMBER = (242, 188, 85)
ORANGE = (255, 157, 69)
CLAY = (221, 115, 80)

INK = (28, 25, 23)
GRAY = (87, 83, 78)
FAINT = (120, 113, 108)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default(size)


def circle(img: Image.Image, size: int) -> Image.Image:
    """居中裁成正方形并缩放到 size，返回 RGBA 圆形图。"""
    src = img.convert("RGBA")
    side = min(src.size)
    left = (src.width - side) // 2
    top = (src.height - side) // 2
    src = src.crop((left, top, left + side, top + side)).resize(
        (size, size), Image.LANCZOS
    )

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    src.putalpha(mask)
    return src


def flat_discs(
    width: int,
    height: int,
    discs: list[tuple[tuple[int, int, int], float, float, float, float]],
    base: tuple[int, int, int],
) -> Image.Image:
    """纯平色块构图：一个底色 + 若干实心圆（不是径向渐变）。"""
    canvas = Image.new("RGB", (width, height), base)
    diag = float((width**2 + height**2) ** 0.5)

    for color, cx, cy, size, alpha in discs:
        d = size * diag
        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        px, py = cx * width, cy * height
        ImageDraw.Draw(layer).ellipse(
            (px - d / 2, py - d / 2, px + d / 2, py + d / 2),
            fill=(*color, int(round(alpha * 255))),
        )
        canvas = Image.alpha_composite(canvas.convert("RGBA"), layer).convert("RGB")

    return canvas


def make_avatars(src: Image.Image) -> None:
    """侧栏 / 抽屉用的头像，以及一份 favicon 家族。"""
    circle(src, 256).convert("RGB").save(
        PUBLIC / "avatar.jpg", quality=90, optimize=True, progressive=True
    )
    print("avatar  ->", PUBLIC / "avatar.jpg", "256×256")

    for size in (32, 180, 192, 512):
        target = PUBLIC / f"favicon-{size}.png"
        circle(src, size).save(target, optimize=True)
        print(f"favicon -> {target}  {size}×{size}")

    # 浏览器标签页优先用 32，同时留一份 svg 兜底的位置给 ico
    circle(src, 48).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("favicon ->", PUBLIC / "favicon.ico")


def make_og(src: Image.Image) -> None:
    width, height = 1200, 630
    img = flat_discs(
        width,
        height,
        [
            (AMBER, 0.97, 0.06, 0.60, 0.52),
            (ORANGE, 0.92, 0.98, 0.74, 0.44),
            (CLAY, 0.68, 0.34, 0.24, 0.30),
        ],
        base=(255, 245, 236),
    )

    # 三色圆点
    draw = ImageDraw.Draw(img)
    for i, color in enumerate((AMBER, ORANGE, CLAY)):
        cx = 80 + i * 26
        draw.ellipse((cx - 9, 87, cx + 9, 105), fill=color)

    # 左侧：头像 + 站名 + 副标题 + 域名
    avatar = circle(src, 132)
    img.paste(avatar, (80, 168), avatar)

    title_font = load_font(64)
    sub_font = load_font(30)
    url_font = load_font(26)

    draw.text((80, 336), "Wudarensheng blog", font=title_font, fill=INK)
    draw.text((80, 424), "分享科技与技术与实践", font=sub_font, fill=GRAY)

    draw.line((80, 486, 700, 486), fill=(240, 236, 232), width=2)
    draw.text((80, 512), "blog.wudarensheng.top", font=url_font, fill=FAINT)

    img.save(PUBLIC / "og.png", optimize=True)
    print("og      ->", PUBLIC / "og.png")


if __name__ == "__main__":
    if not SOURCE.exists():
        raise SystemExit(f"找不到头像源图：{SOURCE}")

    source = Image.open(SOURCE)
    print(f"源图 {source.size[0]}×{source.size[1]}\n")
    make_avatars(source)
    make_og(source)
