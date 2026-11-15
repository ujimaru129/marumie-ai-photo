# モデル検証

同じ写真・同じスタイルを各 AI モデルにかけ、本人らしさ・止められた割合・待ち時間・費用・見た目を比べる。
目的と合格の目安は `docs/MARUMIE_AI_PHOTO_仕様まとめ.md` の7章。

## 中身

| ファイル | 役割 |
|---|---|
| `prep.py` | 元の写真を長辺1024px・EXIF なしの `p01.jpg`〜 にそろえる |
| `models.py` | モデルの呼び出し（Gemini: Nano Banana 2.1 / Meta: Muse Image） |
| `run.py` | 写真 × スタイル × モデルを一括生成し、`out/results.csv` に記録（途中から再開できる） |
| `sheet.py` | スタイルごとの比較画像（元の写真 / 各モデル）と集計表 `out/summary.md` を作る |
| `styles/*.txt` | スタイルの指示文。先頭の `[effect]` / `[template]` は種類のメモ |

## 手順

```bash
cd eval
python3 prep.py <元の写真のフォルダ> inputs        # 写真をそろえる
python3 run.py --models gemini,meta --workers 3    # 一括生成
python3 sheet.py                                   # 比較画像と集計
```

- キー: Claude Code のクラウド環境では、環境の「Network secrets」に登録したキーをプロキシが自動で付ける
  （Gemini は `generativelanguage.googleapis.com` に `x-goog-api-key`、Meta は `api.meta.ai` に `Authorization: Bearer`）。
  手元で動かすときは環境変数 `GEMINI_API_KEY` / `META_MODEL_API_KEY` を設定する
- 写真・生成した画像はリポジトリに入れない（`.gitignore`）。写っている人の了承を取った写真だけを使う
- 必要なもの: Python 3、Pillow

## まだ無いもの

- **本人らしさの数値**（顔認識の類似度の低下）: 顔認識モデルの選定が必要。研究用の重み（insightface など）は商用不可の
  ものが多いので、ライセンスを確認してから入れる。それまでは比較画像を目で採点する
