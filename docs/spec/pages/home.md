# Home

## 範囲・根拠

- 種別: 接続後に表示される製品紹介ページ。入口は [App](../../../src/App.tsx) の `getTabs` が作る `home` タブ（`/`）。接続前の入口は別の [app shell](../modules/app-shell.md) を参照する。
- 確認: 2026-09-20、この変更のコード確認とローカル Vite / Orca（Demo、日本語・英語・中国語、1322x1071 / 390x844）で実測。
- 関連仕様: 接続・タブ表示の共通条件は [app shell](../modules/app-shell.md)。

| 根拠 | ソース / symbol                                                                                                                                                                 | 確認内容                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| S1   | [HomePage](../../../src/pages/HomePage.tsx): `HomePage`, `DyaDashImages`, `Dya2Images`                                                                                          | 文言、製品・ガイド・最新リリースカード、外部リンク、画像 |
| S2   | [App](../../../src/App.tsx): `getTabs`, `AppContent`                                                                                                                            | `home` の登録と接続済み画面での表示                      |
| S3   | [release notes data/helpers](../../../src/i18n/releaseNotes.ts), [releaseNotes.json](../../../src/i18n/releaseNotes.json): `getLatestRelease`, `localizeText`, `localizeChange` | 最新の公開済みリリースと表示言語に対応する内容           |

## 機能要求

| ID       | できるべきこと                                                                        | 出典・確度       |
| -------- | ------------------------------------------------------------------------------------- | ---------------- |
| HOME-R01 | DYA Studio と掲載する DYA キーボードを説明し、公式情報へ安全に遷移できる              | S1 から推定      |
| HOME-R02 | 言語設定に応じて翻訳対象の表示ラベルを切り替えられる                                  | S1 から推定      |
| HOME-R03 | 自分の ZMK キーボードを DYA Studio に対応させるための公式ガイドと補足記事へ遷移できる | ユーザー明示要求 |
| HOME-R04 | 最新の公開済みリリース内容を Home で確認し、該当リリースの詳細へ遷移できる            | ユーザー明示要求 |

## 前提・状態

- `home` は通常タブの一つであり、接続が確立した後に `AppContent` が表示する。未接続・接続中・再接続中は本ページを操作できない条件を共有仕様で扱う。
- ready: `Welcome to DYA Studio`、Features、DYA Keyboard series、Q&A が描画される。loading、empty、dirty、saving は固有状態を持たない。
- external: X、GitHub、Booth、GitHub Pages、note、ZMK Studio へ `target="_blank"` のリンクを持つ。外部サイトの内容・可用性・新規タブの実挙動は未検証である。
- latest release: build に取り込まれた `releaseNotes.json` のうち `upcoming` を除く先頭を表示する。公開済みリリースがなければカードは表示しない。内容が空なら専用の空表示を出す。

## 現行の機能仕様

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID       | 前提 → 操作                                                           | 観測できる結果                                                                                | 保存範囲・副作用                                                | 根拠           |
| -------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- |
| HOME-001 | 接続済み → `Home` を選ぶ                                              | Welcome、発音注記、Features と Q&A を表示                                                     | 読み取り専用。キーボード・browser storage を書き込まない        | S1/S2          |
| HOME-002 | `Share on X` を選ぶ                                                   | X intent URL に `DYA Studio for DYA & ZMK Keyboards`、Studio URL、ハッシュタグを渡す          | 外部サイトを開く。投稿成立は DYA Studio では確認しない          | S1 `xShareUrl` |
| HOME-003 | DYA Dash または DYA2 の `Design` / `Buy` / `Docs` を選ぶ              | 各カードに対応する外部リンク、製品説明、画像を表示                                            | 外部遷移のみ。購入・設計資料の内容は本仕様の範囲外              | S1             |
| HOME-004 | 言語を切替後に Home を表示する                                        | `t(...)` で包まれた見出し・説明・リンクラベルが現在言語で表示される                           | 言語設定の保存と切替 UI は app shell / language の責務          | S1             |
| HOME-005 | 開発者向けカードの `Developer Guide` / `Read the note article` を選ぶ | 前者は `/developer-guide`、後者は指定された note 記事を開く                                   | guide は SPA history、note は新規タブ。キーボードへ書き込まない | S1             |
| HOME-006 | 最新リリースカードを見る                                              | 最新の公開済み version/date、summary/highlights、カテゴリ別変更、または空表示を現在言語で表示 | build 内 JSON の読み取りのみ                                    | S1/S3          |
| HOME-007 | `View all release notes` を選ぶ                                       | `/release-notes#<最新version>` を開き、詳細ページの同じ version を指す                        | SPA history/hash のみ                                           | S1/S3          |

## 代表ユーザーフロー

### F1: 製品情報を探す（HOME-001/003）

1. 接続を完了し `Home` を選ぶ。`Welcome to DYA Studio` と DYA Keyboard series を確認する。
2. DYA Dash または DYA2 の説明、掲載画像、表示されているリンクラベルを記録する。
3. `Design` など一つを開く。遷移先の信頼性や購入完了を DYA Studio の成功条件として扱わない。

### F2: 開発資料と最新リリースを探す（HOME-005/006/007）

1. 開発者向けカードでアプリ内 guide と note の両リンク先を記録する。外部 note の本文確認や操作は行わない。
2. 最新リリースカードの version/date と表示内容を release notes data の最新公開済み entry と照合する。
3. `View all release notes` を選び、URL が `/release-notes#<version>` になることを確認する。

### F3: 共有用 URL を開く（HOME-002）

1. `Share on X` を選ぶ。
2. 新しい外部ページに渡された投稿用 text / URL / hashtag を確認する。認証・投稿は行わない。
3. 元の Studio タブに戻り、キーボード接続と Home 表示が維持されるかは未検証として記録する。

## 不変条件

- HOME-I01: Home 内の閲覧・外部リンク選択だけでは、keymap、デバイス設定、接続状態を更新しない（S1）。
- HOME-I02: 外部 URL の取得成功・購入・投稿成功を Studio 内の成功表示として偽装しない（S1）。
- HOME-I03: Home の最新リリースは `upcoming` を最新公開済みリリースとして表示しない（S3）。

## エラーと復帰

- Home 固有の RPC、フォーム、エラー表示、再試行 handler はない。画像または外部サイトの読込失敗に対する page 内 fallback はコードから確認できない。
- 外部サイトで失敗した場合は元タブへ戻る。外部サイトのエラー内容を Studio が表示・保存することは保証しない。

## 探索の観点

1. 日本語・英語で、見出し・リンクラベルと長文が読めるか。
2. 狭い幅で各製品の横並び画像が横スクロール可能で、本文やリンクが押せるか。
3. 最新リリースの長い summary/changes、空リリース、公開済みリリースなしでカードが崩れないか。
4. 新規タブ禁止、外部サイト障害、画像障害時に Studio の接続画面へ意図せず戻らないか。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

外部リンク先の可用性・安全性、画像失敗時の表示、外部タブを閉じた後の接続継続は未検証。最新リリースの内部リンクは `href`、SPA 遷移、直接 URL で確認したが、外部 note / GitHub / Docs / Booth は実際には開いていない。静的な紹介文が現在の製品販売・公開状況を保証するものではない。
