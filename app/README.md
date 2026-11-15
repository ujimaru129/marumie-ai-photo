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

## 確認済み

- 型チェック（`npx tsc --noEmit`）・lint（`npx expo lint`）・Android の JS バンドルの書き出し（`npx expo export --platform android`）
- Web 版で、ローカルの中継サーバー（偽の画像 AI）につないで、初回 → 一覧 → 写真選び → 生成 → 2枚から選ぶ → 報告 → 残り回数の更新、まで通しで動くこと
- **実機では未確認**（画像の選択・撮影・保存・共有はネイティブの部品）

## まだ入れていないもの

- 仕上げ（MARUMIE の LUT・グレイン・雑誌の題字・セルフ写真館のロゴ）… 3. の段階（MARUMIE CAMERA の Skia シェーダーを使う）
- 課金画面・クレジットの購入 … 4. の段階
- 下のタブ（編集・ギャラリー）、スタイルの見本画像、正式なワードマーク（SVG）
