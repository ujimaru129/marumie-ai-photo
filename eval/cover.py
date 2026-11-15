"""雑誌の表紙（T4）の仕上げ: 生成した写真に MARUMIE のワードマーク（題字）を、人物の頭の後ろに重ねる。

VOGUE の表紙のように、題字は背景の上・人物の下に置く（人物の頭が題字の一部を隠す）。
人物の切り抜きは MediaPipe の人物セグメンテーション（MARUMIE CAMERA と同じ selfie_multiclass モデル）。
アプリでは端末内で同じことをする想定（AI には文字を描かせない。文字は崩れやすく、ブランドの題字は正確に出したいため）。

使い方: python3 cover.py <生成した写真> <出力> [--model selfie_multiclass_256x256.tflite] [--issue "No.01 2026"]
"""
import argparse
import io
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "docs", "ai-mode-mock", "fonts")
BRAND = os.path.join(HERE, "..", "assets", "brand")


def person_mask(img, model_path):
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model_path), output_category_mask=True))
    res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(img.convert("RGB"))))
    cat = np.squeeze(res.category_mask.numpy_view())  # 0 = 背景、1以上 = 人物（髪・肌・服など）
    m = Image.fromarray(((cat > 0) * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    return m.filter(ImageFilter.GaussianBlur(1.5))


def pick_color(img):
    """背景（上の帯）の色から、題字の色を決める: 背景より少し濃い同系色（VOGUE の表紙と同じ考え方）。"""
    top = np.asarray(img.convert("RGB").crop((0, 0, img.width, int(img.height * 0.12)))).reshape(-1, 3).mean(0)
    lum = top @ [0.299, 0.587, 0.114]
    if lum > 140:
        return tuple(int(c * 0.55) for c in top)
    return tuple(int(c + (255 - c) * 0.7) for c in top)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--model", default=os.path.join(HERE, "..", "..", "marumie-camera", "assets", "models", "selfie_multiclass_256x256.tflite"))
    ap.add_argument("--issue", default="No.01  2026")
    a = ap.parse_args()

    img = Image.open(a.src).convert("RGB")
    W, H = img.size
    mask = person_mask(img, a.model)
    color = pick_color(img)

    # 題字: MARUMIE の正式なワードマーク（assets/brand の SVG）。横幅いっぱい（左右の余白 3%）、上から 2.5% の位置。
    # 背景が明るければ Ink（#1A1A1A）、暗ければ Paper（#F8F6EF）。赤い丸（#D74343）はどちらも同じ。
    import cairosvg
    variant = "ink" if (np.array(color) @ [0.299, 0.587, 0.114]) < 128 else "paper"
    svg = os.path.join(BRAND, f"marumie-wordmark-{variant}.svg")
    wm = Image.open(io.BytesIO(cairosvg.svg2png(url=svg, output_width=int(W * 0.94)))).convert("RGBA")
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    y = int(H * 0.025)
    layer.alpha_composite(wm, (int((W - wm.width) / 2), y))
    d = ImageDraw.Draw(layer)
    tone = (26, 26, 26, 255) if variant == "ink" else (248, 246, 239, 255)
    # 小さな添え字（号数）
    small = ImageFont.truetype(os.path.join(FONTS, "Jost-700.ttf"), max(14, W // 50))
    d.text((W * 0.035, y + wm.height + H * 0.008), a.issue, font=small, fill=tone)

    # 背景 → 題字 → 人物 の順に重ねる（人物が題字の手前に来る）
    behind = Image.alpha_composite(img.convert("RGBA"), layer)
    out = Image.composite(img.convert("RGBA"), behind, mask)
    out.convert("RGB").save(a.dst, quality=92)
    print("表紙:", a.dst, "ワードマーク:", variant)


if __name__ == "__main__":
    main()
