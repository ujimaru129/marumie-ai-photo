"""シグネチャー仕上げ: AI で作った写真に、MARUMIE の LUT（フィルター）を後からかける。

アプリでは端末内の Skia シェーダーでかける（MARUMIE CAMERA と同じ仕組み）。ここでは見え方の確認用に、
同じ LUT 画像（33³ の帯テクスチャ: x = b*33 + r, y = g）を Python でトライリニア補間してかける。

使い方: python3 finish.py <写真> <出力> <LUT の png> [--strength 0.8]
"""
import argparse

import numpy as np
from PIL import Image

N = 33


def load_lut(path):
    t = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255  # [g, b*33 + r]
    return t.reshape(N, N, N, 3)  # [g, b, r, 3]


def apply_lut(img, lut, strength=1.0):
    x = np.asarray(img.convert("RGB"), dtype=np.float32) / 255
    p = x * (N - 1)
    i0 = np.floor(p).astype(np.int32)
    i1 = np.minimum(i0 + 1, N - 1)
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
