# 中継サーバー（Cloudflare Workers）

アプリ → このサーバー → 画像 AI（Meta Muse Image、予備に Gemini）。APIキーと指示文（プロンプト）はここだけに置く。

## できること（試作）

| API | 内容 |
|---|---|
| `POST /v1/devices` | 匿名の端末登録。18歳以上の確認（`adult: true`）と外部 AI への送信の同意（`consentVersion`）が必要。生年は受け取らない。初回の無料生成が1回付く |
| `GET /v1/me` | 残りの無料回数とクレジット |
| `GET /v1/styles` | スタイルの一覧（名前・仕上げの設定・枠の色などの選択肢・`mirror`）。**指示文は返さない** |
| `POST /v1/generate` | 写真（JPEG、4MB まで）とスタイルを受け取り、2枚のバリエーションを同時に作る。無料の回数 → クレジットの順で消費。1枚もできなければ返す |
| `GET /v1/results/:id/:n` | 結果の画像。本人の端末からだけ取れる。24時間で消える |
| `POST /v1/reports` | 問題の報告（理由: not_me / inappropriate / minor / quality / other） |

- 認証は `Authorization: Bearer <deviceId>.<token>`。サーバーはトークンのハッシュだけを持つ
- モデルの順番: Muse Image（`META_REASONING`）→ 失敗したら Muse Image（low）→ 失敗したら Gemini。
  **安全チェックで止められた場合は別のモデルで作り直さない**（止められた内容を回り道で通さないため）
- 送られた写真は保存しない（画像 AI に渡すだけ）。結果は R2 に置き、24時間で消す
- `mirror: true` のスタイル（セルフ写真館）は、アプリが写真を左右反転して送り、結果をもう一度反転して表示する
  （サーバーには画像処理の部品がないため。仕上げの LUT・グレイン・ロゴもアプリ側）
- スタイルの中身は `eval/catalog.json`・`eval/styles/*.txt`・`eval/signature.json` から `npm run styles` で作る（検証と同じ指示文を使う）

## 手元で試す

```sh
npm install
npm test        # 偽の画像 AI を立てて、ローカルの wrangler dev に対して25項目を確認する（本物の AI は呼ばない、費用なし）
npm run typecheck
```

## 公開する（Cloudflare のアカウントが必要）

```sh
npx wrangler login
npx wrangler d1 create marumie-ai-photo                 # 出てきた database_id を wrangler.jsonc に書く
npx wrangler d1 execute marumie-ai-photo --remote --file schema.sql
npx wrangler r2 bucket create marumie-ai-photo-results
npx wrangler r2 bucket lifecycle add marumie-ai-photo-results expire-results results/ --expire-days 1
npx wrangler secret put META_API_KEY
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

## スタイルの見本画像

R2 の `samples/<スタイルID>.jpg`（編集タブの見本は `samples/edit_before.jpg`・`edit_after.jpg`・`filter_0〜9.jpg`）。`GET /v1/samples/<名前>` で誰でも見られる。
2026-11-17 時点では、検証で作った写真（協力者の方の写真、了解済み）を仮に入れてある。**公開前に公開用の見本に差し替える**。
入れ方: `npx wrangler r2 object put marumie-ai-photo-results/samples/<名前>.jpg --file <画像> --content-type image/jpeg --remote`

## まだ入れていないもの（次の段階）

- 端末の証明（App Attest / Play Integrity）と、同じ端末での登録のし直し対策（4. 課金の段階）
- RevenueCat の Webhook でクレジットを付与する（4. 課金の段階）
- 入力写真の安全チェック（未成年らしさなど）は、今は画像 AI 側のチェックだけ
- 同じ端末からの連続リクエストの制限
