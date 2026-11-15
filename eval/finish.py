"""シグネチャー仕上げ: AI で作った写真に、MARUMIE の LUT（フィルター）を後からかける。

アプリでは端末内の Skia シェーダーでかける（MARUMIE CAMERA と同じ仕組み）。ここでは見え方の確認用に、
同じ LUT 画像（33³ の帯テクスチャ: x = b*33 + r, y = g）を Python でトライリニア補間してかける。

使い方: python3 finish.py <写真> <出力> <LUT（.cube か png）> [--strength 0.8]

MARUMIE の LUT（隊長作成、2026-11-16）: assets/luts/MARUMIE_DayTeal_Smoky_*.cube（昼）・MARUMIE_NightTeal_Smoky_*.cube（夜）
"""
import argparse

import numpy as np
from PIL import Image

N = 33


def load_lut(path):
    """LUT を [g, b, r, 3] の配列で返す。.cube（サイズは何でも）と、MARUMIE CAMERA の帯テクスチャ png（33）に対応。"""
    if path.lower().endswith(".cube"):
        size, rows = None, []
        for line in open(path, encoding="utf-8"):
            t = line.split()
            if not t or t[0].startswith("#"):
                continue
            if t[0] == "LUT_3D_SIZE":
                size = int(t[1])
            elif len(t) == 3 and t[0][0] in "0123456789.-":
                rows.append([float(v) for v in t])
        # .cube は赤が最も速く変わる順 → reshape で [b, g, r] → [g, b, r] に並べ替える
        return np.array(rows, dtype=np.float32).reshape(size, size, size, 3).transpose(1, 0, 2, 3)
    t = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255  # [g, b*33 + r]
    return t.reshape(N, N, N, 3)  # [g, b, r, 3]


def apply_lut(img, lut, strength=1.0):
    n = lut.shape[0]
    x = np.asarray(img.convert("RGB"), dtype=np.float32) / 255
    p = x * (n - 1)
    i0 = np.floor(p).astype(np.int32)
    i1 = np.minimum(i0 + 1, n - 1)
    f = p - i0
    out = 0
    for dr in (0, 1):
        for dg in (0, 1):
            for db in (0, 1):
                r = i1[..., 0] if dr else i0[..., 0]
                g = i1[..., 1] if dg else i0[..., 1]
                b = i1[..., 2] if db else i0[..., 2]
                w = (f[..., 0] if dr else 1 - f[..., 0]) * (f[..., 1] if dg else 1 - f[..., 1]) * (f[..., 2] if db else 1 - f[..., 2])
                out = out + lut[g, b, r] * w[..., None]
    out = x * (1 - strength) + out * strength
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


def add_grain(img, amount):
    """細かい白黒のノイズ（グレイン）を足す。amount 0〜1。粒の大きさは画像の長辺に合わせる（1000px あたり1px 程度）。
    暗い所ほど目立ち、明るい所では控えめにする（フィルムやセンサーのノイズと同じ傾向）。"""
    if amount <= 0:
        return img
    x = np.asarray(img.convert("RGB"), dtype=np.float32) / 255
    h, w = x.shape[:2]
    cell = max(1, round(max(h, w) / 1400))
    rng = np.random.default_rng(0)
    n = rng.normal(0, 1, ((h + cell - 1) // cell, (w + cell - 1) // cell)).astype(np.float32)
    n = np.repeat(np.repeat(n, cell, 0), cell, 1)[:h, :w, None]
    lum = x @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    x = x + n * 0.045 * amount * (1 - 0.6 * lum[..., None])
    return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))


def finish(img, style, signature, lut_dir):
    """signature.json の設定に従って、LUT とグレインをかける。"""
    v = signature["styles"].get(style)
    if v is None:
        return img
    if isinstance(v, str):
        v = {"lut": v}
    kind = v.get("lut")
    if kind:
        base = signature[kind]
        lut = load_lut(f"{lut_dir}/{base['lut']}_65.cube")
        img = apply_lut(img, lut, v.get("strength", base["strength"]))
    return add_grain(img, v.get("grain", 0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("lut")
    ap.add_argument("--strength", type=float, default=0.8)
    a = ap.parse_args()
    apply_lut(Image.open(a.src), load_lut(a.lut), a.strength).save(a.dst, quality=92)


if __name__ == "__main__":
    main()
