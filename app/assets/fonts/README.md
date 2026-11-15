# アプリの書体

| ファイル | 書体 | ライセンス | 入手元 |
|---|---|---|---|
| `Inter-*.ttf` | Inter（英語・数字） | SIL Open Font License 1.1 | `@expo-google-fonts/inter@0.4.2`（Google Fonts） |
| `NotoSansJP-*.ttf` | Noto Sans JP（日本語） | SIL Open Font License 1.1 | `@expo-google-fonts/noto-sans-jp@0.4.4`（Google Fonts） |

Noto Sans JP は、アプリを軽くするため JIS 第1・第2水準の漢字・かな・英数記号（7,045字）に絞ってある（1ウェイト 5.7MB → 2.6MB）。
作り直すときは fonttools の `pyftsubset` で、Shift_JIS で表せる文字（＋「〜」など）を `--unicodes-file` に渡す。
