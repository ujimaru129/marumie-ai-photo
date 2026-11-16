# MARUMIE AI PHOTO（アプリ、Expo SDK 57）

試作（2. の段階）。中継サーバーは `../server`。

## 画面

| 画面 | ファイル | 内容 |
|---|---|---|
| 年齢の確認 | `src/app/onboarding/age.tsx` | 生まれた年（18歳になる年の人だけ月も）。生年はサーバーに送らず、端末にも残さない。18歳未満と答えた端末は答え直せない |
| 同意 | `src/app/onboarding/consent.tsx` | 外部の画像 AI に写真を送ることへの同意 → 匿名の端末登録（初回の無料1回） |
| スタイル一覧 | `src/app/index.tsx` | テンプレート / エフェクト。残りの無料回数・クレジット。見本の画像は仮の色 |
| スタイル | `src/app/style/[id].tsx` | 枠の色などの選択、写真を選ぶ / 撮る、「本人の写真です」の確認 |
| 生成中 | `src/app/generating.tsx` | 長辺1024px の JPEG にして送る → 2枚を受け取る。失敗したら回数は減らない |
| 結果 | `src/app/result.tsx` | 2枚から選ぶ、押している間は元の写真、保存・共有・もう一度・問題を報告、「AI で作成」の表示 |

- 英語・日本語は端末の言語で切り替え（`src/lib/i18n.ts`）
- 端末ID とトークンは SecureStore（`src/lib/session.ts`）
- `*.web.ts` は開発時に Web で画面を確かめるためのもの（本番はネイティブだけ）

## 動かす

```sh
npm install
EXPO_PUBLIC_API_URL=http://<中継サーバー> npx expo start
```

ネイティブの部品（画像の選択・保存など）を使うので、実機では開発用ビルド（`npx expo run:android` / `eas build --profile development`）で動かす。

## 仕上げ（src/finish）

生成した写真に、端末内で MARUMIE の仕上げをかけてから表示・保存する。

| 処理 | 内容 |
|---|---|
| LUT＋グレイン | MARUMIE Day / Night（`assets/luts`、33³ の帯テクスチャ。MARUMIE CAMERA と同じ形式）を、スタイルごとの強さでかける。グレインは暗い所ほど強く |
| セルフ写真館 | 枠の色と下の余白を見つけ、余白を枠の色で塗って「MARUMIE PHOTO」（`assets/brand/booth-lockup-*.png`）を置く |
| 雑誌の表紙 | 人物の切り抜き（MediaPipe selfie_multiclass、`assets/models`、Apache 2.0）で人物の大きさをそろえて切り出し、題字を人物の後ろに置く |

- 中身（`core.ts`）は Skia を引数で受け取るので、Node でも動かせる。`npx tsx scripts/check-finish.ts` / `scripts/check-cover.ts` で検証の Python と見比べた（LUT の差は平均 1/255 程度）
- Web 版では人物の切り抜きはしない（題字は人物の上にのる）。切り抜きは実機でだけ動く（未確認）
- 人物の切り抜きのモデルは 16MB あり、アプリが重くなる。雑誌の表紙のためだけなので、後でサーバー側やもっと小さいモデルも検討する

## 確認済み

- 型チェック（`npx tsc --noEmit`）・lint（`npx expo lint`）・Android の JS バンドルの書き出し（`npx expo export --platform android`）
- Web 版で、ローカルの中継サーバー（偽の画像 AI）につないで、初回 → 一覧 → 写真選び → 生成 → 2枚から選ぶ → 報告 → 残り回数の更新、まで通しで動くこと
- **実機では未確認**（画像の選択・撮影・保存・共有はネイティブの部品）

## まだ入れていないもの

- 課金画面・クレジットの購入 … 4. の段階
- 公開用のスタイルの見本画像（今は検証の写真を試作でだけ使用。リポジトリには入れず、サーバーの R2 `samples/` から配る）
