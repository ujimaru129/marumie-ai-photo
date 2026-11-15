"""雑誌の表紙（T4）の仕上げ: 生成した写真に MARUMIE のワードマーク（題字）を、人物の頭の後ろに重ねる。

VOGUE の表紙のように、題字は背景の上・人物の下に置く（人物の頭が題字の一部を隠す）。
人物の切り抜きは MediaPipe の人物セグメンテーション（MARUMIE CAMERA と同じ selfie_multiclass モデル）。
アプリでは端末内で同じことをする想定（AI には文字を描かせない。文字は崩れやすく、ブランドの題字は正確に出したいため）。

使い方: python3 cover.py <生成した写真> <出力> [--model selfie_multiclass_256x256.tflite]

人物の大きさは frame() でそろえる（顔の高さ・頭の位置。拡大は1.5倍まで）。仕上がりは 1344×1792（3:4）。
"""
import argparse
import io
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "docs", "ai-mode-mock", "fonts")
BRAND = os.path.join(HERE, "..", "assets", "brand")


def categories(img, model_path):
    """人物の部位の分類（MediaPipe selfie_multiclass）: 0 背景 / 1 髪 / 2 体の肌 / 3 顔の肌 / 4 服 / 5 その他。画像と同じ大きさで返す。"""
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model_path), output_category_mask=True))
    res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(img.convert("RGB"))))
    cat = np.squeeze(res.category_mask.numpy_view()).astype(np.uint8)
    return np.array(Image.fromarray(cat).resize(img.size, Image.NEAREST))


def person_mask(cat):
    m = Image.fromarray(((cat > 0) * 255).astype(np.uint8))
    return m.filter(ImageFilter.GaussianBlur(1.5))


def frame(img, cat, out_size=(1344, 1792), face_ratio=0.22, head_top=0.08, max_zoom=1.5):
    """人物の大きさと位置をそろえて、表紙の大きさ（3:4）に切り出す。
    - 顔の高さが画面の face_ratio になるように拡大する（劣化を抑えるため max_zoom 倍まで。大きすぎる人物は縮小しない）
    - 頭のてっぺん（髪の上端）を上から head_top の位置にそろえ、顔を左右の中央に置く
    戻り値: (切り出した画像, 実際の拡大率)"""
    W, H = img.size
    ow, oh = out_size
    base = min(W / ow, H / oh)  # 拡大なしで 3:4 を切り出すときの倍率
    fy, fx = np.where(cat == 3)
    hy, _ = np.where((cat == 1) | (cat == 3))
    if len(fy) == 0:
        zoom, top, cx = 1.0, None, W / 2
    else:
        face_h = (fy.max() - fy.min()) / (oh * base)  # 拡大なしの切り出しに対する顔の高さの割合
        zoom = min(max(face_ratio / face_h, 1.0), max_zoom)
        top, cx = hy.min(), fx.mean()
    cw, ch = ow * base / zoom, oh * base / zoom  # 元の画像の上で切り出す範囲
    x0 = min(max(cx - cw / 2, 0), W - cw)
    y0 = 0 if top is None else min(max(top - head_top * ch, 0), H - ch)
    crop = img.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize(out_size, Image.LANCZOS)
    return crop, zoom


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
    a = ap.parse_args()

    img = Image.open(a.src).convert("RGB")
    img, zoom = frame(img, categories(img, a.model))
    W, H = img.size
    mask = person_mask(categories(img, a.model))
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

    # 背景 → 題字 → 人物 の順に重ねる（人物が題字の手前に来る）
    behind = Image.alpha_composite(img.convert("RGBA"), layer)
    out = Image.composite(img.convert("RGBA"), behind, mask)
    out.convert("RGB").save(a.dst, quality=92)
    print("表紙:", a.dst, "ワードマーク:", variant, "拡大: %.2f倍" % zoom)


if __name__ == "__main__":
    main()
