"""検証用の写真を、AI に送るときと同じ条件にそろえる。

- 写真の向き（EXIF の回転情報）を反映してから、長辺1024pxに縮める
- 撮影場所などの情報（EXIF）は付けずに保存する（外部の AI に送らないため）
- 名前を p01.jpg, p02.jpg ... に付け直す（元のファイル名の末尾の番号順）

使い方: python3 prep.py <元の写真のフォルダ> <出力フォルダ（例 inputs）>
"""
import glob
import os
import re
import sys

from PIL import Image, ImageOps


def order(path):
    m = re.findall(r"\d+", os.path.basename(path))
    return int(m[-1]) if m else 0


def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    files = sorted([f for f in glob.glob(os.path.join(src, "*")) if f.lower().endswith((".jpg", ".jpeg", ".png", ".heic"))], key=order)
    for i, f in enumerate(files, 1):
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        im.thumbnail((1024, 1024), Image.LANCZOS)
        out = os.path.join(dst, f"p{i:02d}.jpg")
        im.save(out, quality=92)
        print(f"{os.path.basename(f)} -> {os.path.basename(out)} {im.size}")


if __name__ == "__main__":
    main()
