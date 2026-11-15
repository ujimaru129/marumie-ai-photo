"""比較画像を作る: スタイルごとに1枚。行=写真、列=元の写真 / 各モデルの結果。

使い方: python3 sheet.py --inputs inputs --out out
出力: out/sheet__<スタイル>.jpg と、results.csv をまとめた out/summary.md
"""
import argparse
import csv
import glob
import os
import statistics
from collections import defaultdict

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "docs", "ai-mode-mock", "fonts", "NotoSansJP-400.ttf")


def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inputs", default=os.path.join(HERE, "inputs"))
    ap.add_argument("--out", default=os.path.join(HERE, "out"))
    ap.add_argument("--h", type=int, default=360)
    a = ap.parse_args()
    models = sorted(d for d in os.listdir(a.out) if os.path.isdir(os.path.join(a.out, d)))
    photos = sorted(glob.glob(os.path.join(a.inputs, "*.jpg")))
    styles = sorted({os.path.basename(f).split("__")[1].rsplit(".", 1)[0]
                     for m in models for f in glob.glob(os.path.join(a.out, m, "*__*.png"))})
    H, pad, head = a.h, 8, 40
    f = font(18)
    for s in styles:
        rows = []
        for p in photos:
            name = os.path.splitext(os.path.basename(p))[0]
            cells = [Image.open(p).convert("RGB")]
            for m in models:
                g = os.path.join(a.out, m, f"{name}__{s}.png")
                cells.append(Image.open(g).convert("RGB") if os.path.exists(g) else None)
            rows.append((name, cells))
        cw = int(H * 0.75)
        W = pad + (cw + pad) * (1 + len(models))
        S = Image.new("RGB", (W, head + len(rows) * (H + pad) + pad), (248, 246, 239))
        d = ImageDraw.Draw(S)
        for j, label in enumerate(["元の写真"] + models):
            d.text((pad + j * (cw + pad), 10), f"{s}  /  {label}" if j == 0 else label, fill=(26, 26, 26), font=f)
        for i, (name, cells) in enumerate(rows):
            y = head + i * (H + pad)
            for j, c in enumerate(cells):
                x = pad + j * (cw + pad)
                if c is None:
                    d.rectangle([x, y, x + cw, y + H], fill=(225, 221, 212))
                    d.text((x + 10, y + H // 2), "なし（止められた/失敗）", fill=(120, 116, 110), font=f)
                    continue
                c.thumbnail((cw, H))
                S.paste(c, (x + (cw - c.width) // 2, y + (H - c.height) // 2))
            d.text((pad + 4, y + 4), name, fill=(255, 255, 255), font=f)
        S.save(os.path.join(a.out, f"sheet__{s}.jpg"), quality=88)
        print("比較画像:", os.path.join(a.out, f"sheet__{s}.jpg"))

    # 結果の集計
    rows = list(csv.DictReader(open(os.path.join(a.out, "results.csv"), encoding="utf-8")))
    by = defaultdict(list)
    for r in rows:
        by[(r["model"], r["style"])].append(r)
    lines = ["| モデル | スタイル | 件数 | 成功 | 止められた | エラー | 待ち時間 中央値 | 10回中9回の待ち時間 | 費用(USD) |", "|---|---|---|---|---|---|---|---|---|"]
    for (m, s), rs in sorted(by.items()):
        ok = [float(r["sec"]) for r in rs if r["status"] == "ok"]
        p90 = sorted(ok)[max(0, int(len(ok) * 0.9) - 1)] if ok else 0
        lines.append(f"| {m} | {s} | {len(rs)} | {len(ok)} | {sum(r['status']=='blocked' for r in rs)} | "
                     f"{sum(r['status']=='error' for r in rs)} | {statistics.median(ok) if ok else 0:.1f}s | {p90:.1f}s | "
                     f"{sum(float(r['usd']) for r in rs):.2f} |")
    open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
