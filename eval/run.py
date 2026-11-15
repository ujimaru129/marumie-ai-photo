"""検証の一括実行: 写真 × スタイル × モデル をすべて生成し、結果を results.csv に記録する。

使い方（リポジトリの eval フォルダから）:
  python3 run.py --inputs inputs --out out --models gemini,meta --styles all --workers 3
  python3 run.py ... --photos p01,p09 --styles digicam_flash      # 一部だけ
  python3 run.py ... --max-usd 5                                   # 見込み額の上限（初期値 $2。超えるなら実行しない）
すでに出力がある組み合わせは飛ばす（途中で止まっても、もう一度実行すれば続きから）。

inputs/ … 長辺1024px・EXIF を消した JPEG（prep.py で作る）。写真はリポジトリに入れない（.gitignore）
styles/ … スタイルごとの指示文（<名前>.txt）
"""
import argparse
import concurrent.futures as cf
import csv
import datetime
import io
import glob
import json
import os
import threading

from PIL import Image

from models import MODELS, PRICE_USD

HERE = os.path.dirname(os.path.abspath(__file__))
lock = threading.Lock()


def load_styles(names):
    files = sorted(glob.glob(os.path.join(HERE, "styles", "*.txt")))
    styles = {os.path.splitext(os.path.basename(f))[0]: open(f, encoding="utf-8").read().strip() for f in files}
    if names != "all":
        styles = {k: v for k, v in styles.items() if k in names.split(",")}
    return styles


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inputs", default=os.path.join(HERE, "inputs"))
    ap.add_argument("--out", default=os.path.join(HERE, "out"))
    ap.add_argument("--models", default="gemini,meta")
    ap.add_argument("--styles", default="all")
    ap.add_argument("--photos", default="all")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--max-usd", type=float, default=2.0)
    a = ap.parse_args()

    photos = sorted(glob.glob(os.path.join(a.inputs, "*.jpg")))
    if a.photos != "all":
        photos = [p for p in photos if os.path.splitext(os.path.basename(p))[0] in a.photos.split(",")]
    styles = load_styles(a.styles)
    models = a.models.split(",")
    os.makedirs(a.out, exist_ok=True)
    csv_path = os.path.join(a.out, "results.csv")
    new = not os.path.exists(csv_path)

    jobs = []
    for m in models:
        os.makedirs(os.path.join(a.out, m), exist_ok=True)
        for s in styles:
            for p in photos:
                name = os.path.splitext(os.path.basename(p))[0]
                dst = os.path.join(a.out, m, f"{name}__{s}.png")
                if not os.path.exists(dst):
                    jobs.append((m, s, p, name, dst))
    est = sum(PRICE_USD[j[0]] for j in jobs)
    print(f"生成する組み合わせ: {len(jobs)} 件（写真 {len(photos)} × スタイル {len(styles)} × モデル {len(models)}、済みは飛ばす）"
          f" 見込み額 ${est:.2f}")
    if est > a.max_usd:
        raise SystemExit(f"見込み額 ${est:.2f} が上限 ${a.max_usd:.2f} を超えるので実行しない（--max-usd で変えられる）")

    def work(job):
        m, s, p, name, dst = job
        img, info = MODELS[m](open(p, "rb").read(), styles[s])
        if img:
            # モデルによって形式が違う（Gemini は PNG、Muse Image は WebP）ので PNG にそろえる
            Image.open(io.BytesIO(img)).save(dst, "PNG")
        row = {"time": datetime.datetime.now().isoformat(timespec="seconds"), "model": m, "style": s, "photo": name,
               "status": info["status"], "sec": info["sec"], "usd": PRICE_USD[m] if info["status"] == "ok" else 0,
               "usage": json.dumps(info.get("usage"), ensure_ascii=False) if info.get("usage") else "",
               "detail": info.get("detail", "")}
        with lock:
            with open(csv_path, "a", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=list(row))
                if f.tell() == 0:
                    w.writeheader()
                w.writerow(row)
        print(f"{m:6s} {s:16s} {name}  {info['status']:7s} {info['sec']:5.1f}s")
        return row

    with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
        list(ex.map(work, jobs))


if __name__ == "__main__":
    main()
