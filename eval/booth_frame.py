"""韓国のセルフ写真館風（korean_booth / korean_booth_black）の仕上げ: 枠の下の余白に「MARUMIE PHOTO」を入れる。

AI には文字を描かせない（崩れやすいため）。端末内でロゴを重ねる想定で、ここでは見え方の確認用に合成する。
- 枠の色を画像の四隅から読み取り、下から見て「枠の色だけの行」が続く範囲を下の余白とみなす
- 下の余白を枠の色で塗りつぶし（AI が描いた四角などを消す）、中央に MARUMIE のワードマーク（Paper 版）と「PHOTO」を置く

使い方: python3 booth_frame.py <生成した写真> <出力>
"""
import io
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(HERE, "..", "assets", "brand")
FONTS = os.path.join(HERE, "..", "docs", "ai-mode-mock", "fonts")


def bottom_margin(img):
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    k = max(4, w // 60)
    corners = np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)])
    frame = np.median(corners, 0)
    # 行の中央 80% が枠の色に近ければ「枠だけの行」
    mid = a[:, int(w * 0.1):int(w * 0.9)]
    plain = (np.abs(mid - frame).max(2) < 40).mean(1) > 0.97
    y = h - 1
    while y > 0 and plain[y]:
        y -= 1
    return frame, y + 1, h  # 余白は y+1 〜 h


def main():
    import cairosvg
    src, dst = sys.argv[1], sys.argv[2]
    img = Image.open(src).convert("RGB")
    W, H = img.size
    frame, top, bottom = bottom_margin(img)
    margin = bottom - top
    lum = float(frame @ [0.299, 0.587, 0.114])
    variant = "paper" if lum < 140 else "ink"
    tone = (248, 246, 239) if variant == "paper" else (26, 26, 26)
    # ワードマークの幅は横幅の 28%（余白が狭いときは余白の高さに合わせて小さくする）
    wm_w = int(W * 0.28)
    wm_h = wm_w * 1667.4 / 9534.6
    if wm_h > margin * 0.45:
        wm_w = int(margin * 0.45 * 9534.6 / 1667.4)
    wm = Image.open(io.BytesIO(cairosvg.svg2png(url=os.path.join(BRAND, f"marumie-wordmark-{variant}.svg"), output_width=wm_w))).convert("RGBA")
    f = ImageFont.truetype(os.path.join(FONTS, "Jost-700.ttf"), max(12, int(wm.height * 0.42)))
    d0 = ImageDraw.Draw(img)
    label = "P H O T O"
    tw = d0.textlength(label, font=f)
    gap = wm.height * 0.45
    total = wm.width + gap + tw
    x = (W - total) / 2
    y = top + (margin - wm.height) / 2
    out = img.convert("RGBA")
    # AI が余白に四角や模様を描くことがあるので、ロゴを置く前に下の余白全体を枠の色で塗りつぶす
    ImageDraw.Draw(out).rectangle((0, top, W, H), fill=tuple(int(c) for c in frame) + (255,))
    out.alpha_composite(wm, (int(x), int(y)))
    d = ImageDraw.Draw(out)
    bb = d.textbbox((0, 0), label, font=f)
    d.text((x + wm.width + gap, y + wm.height - (bb[3] - bb[1]) - bb[1]), label, font=f, fill=tone + (255,))
    out.convert("RGB").save(dst, quality=92)
    print("枠の色", tuple(int(c) for c in frame), "下の余白", margin, "px", variant)


if __name__ == "__main__":
    main()
