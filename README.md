# MARUMIE AI PHOTO

自撮りとスタイルを選ぶと、AI が「本人のまま」別の雰囲気の写真に作り直し、MARUMIE の色で仕上げるアプリ。
MARUMIE CAMERA（`ujimaru129/marumie-camera`）の姉妹アプリ。18歳以上向け、日本と海外に同時公開予定。

## 今の段階

企画・設計とモデル検証。アプリ本体（Expo）と中継サーバーはまだ無い。

## 資料

| ファイル | 内容 |
|---|---|
| `docs/MARUMIE_AI_PHOTO_仕様まとめ.md` | **今の決定事項（まずこれを読む）** |
| `docs/AI生成機能_設計書.md` | 経緯と詳細 |
| `docs/AIモデル調査_2026-11.md` | AI モデルの品質・費用・規約の調査 |
| `docs/MARUMIE_AI_PHOTO_課金・採算_改善提案_2026-11-09.docx` | 課金・採算の改善提案 |
| `docs/ai-mode-mock/` | 画面案（`mock.png`: 流れ全体、`paywall.png`: 課金画面） |
| `eval/` | モデル検証の仕組み（`eval/README.md`） |

これらの資料は 2026-11-15 に marumie-camera（ブランチ `ccr-db9bb3d0-edoazf`）の docs から移した。以後はこのリポジトリを正とする。
