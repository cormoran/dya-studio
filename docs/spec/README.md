# DYA Studio 仕様書

目的は、AI agent がブラウザによる探索的テストを実施し、観測した現象が要求違反・実装との差分・環境制約のどれかを判定できること。仕様は日本語、画面のラベルは検索できるよう英語原文を併記する。

## 機能全体の overview

DYA Studio は ZMK キーボードに USB/Bluetooth または擬似デバイスの Demo で接続し、キー割当、macro/combo、ポインティング入力、接続先、各種設定を編集する UI。firmware が公開する subsystem によって使える機能が変わる。Troubleshooting と Debug Tool は診断、Subsystems は対応状況と外部 UI の入口、Import/Export は設定の交換を扱う。Home は製品情報。開発者ガイドとリリースノートは接続前から利用できる。

通常タブは接続中に表示し、訪問したタブを保持するので、タブ往復は再接続・再読込と同じではない。多くの編集はデバイス RAM への適用と flash 保存が別だが、即時保存の設定もある。ブラウザの表示設定・履歴・認証状態もそれぞれ別の保存領域を持つ。ページ仕様の保存範囲を優先し、全ページに一律の Save/Discard 意味を当てはめない。

## 読む順序

1. 作成・更新: [仕様作成標準](AUTHORING.md) → [テンプレート](TEMPLATE.md)。
2. UI テスト: [探索的テストガイド](EXPLORATORY_TESTING.md) → 対象ページ → 参照する共通モジュール。
3. 運用の検証結果: [改善記録](validation/README.md)。

## Sitemap

| 入口 / 機能                        | 仕様                                                                      | 接続条件                                           |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| `/` 接続前                         | [接続・unlock](modules/device-session.md)                                 | 不要                                               |
| `/` Home                           | [ホーム](pages/home.md)                                                   | 接続または Demo                                    |
| `/keymap`                          | [キーマップ](pages/keymap.md) / [rotary encoder](pages/keymap-sensors.md) | 接続または Demo、機能別 capability                 |
| `/macro-combo`                     | [Macro & Combo](pages/macro-combo.md)                                     | 接続 + runtime macro/combo                         |
| `/trackball`                       | [Trackball](pages/trackball.md)                                           | 接続 + 対応入力機能                                |
| `/connection`                      | [接続先設定](pages/connection.md)                                         | 接続 + 機能別 capability                           |
| `/settings`                        | [設定](pages/settings.md)                                                 | 接続 + 機能別 capability                           |
| `/troubleshooting`                 | [診断](pages/troubleshooting.md)                                          | 接続 + 診断 capability                             |
| `/subsystems`                      | [Subsystems](pages/subsystems.md)                                         | 接続                                               |
| `/import-export`                   | [Import/Export](pages/import-export.md)                                   | 接続、local DEV または OAuth client 設定でタブ登録 |
| `/oauth/callback`                  | [OAuth callback](pages/oauth-callback.md)                                 | keyboard 接続不要、認証フローの状態は別途必要      |
| `/release-notes`                   | [リリースノート](pages/release-notes.md)                                  | 不要                                               |
| `/developer-guide` と配下 10 route | [開発者ガイド・全 route 一覧](pages/developer-guide.md)                   | 不要                                               |
| 接続中の Debug Tool ボタン         | [Debug Tool](pages/debug-tool.md)                                         | devtool capability                                 |

入口の母集団は [App.tsx](../../src/App.tsx) の `getTabs` と `AppRouter` / `AppContent` の独立ルート、開発者ガイドは [route 定義](../../src/content/developerGuide.ts)。新しい入口を追加したらこの表とページ仕様を同時に更新する。

## 共有モジュール

| 契約                            | 仕様                                            | 主な consumer                                        |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| route、tab 保持、言語・theme    | [app shell](modules/app-shell.md)               | 全画面                                               |
| transport、再接続、unlock、Demo | [device session](modules/device-session.md)     | 接続画面・全編集ページ                               |
| binding の選択/終了/適用        | [binding editor](modules/binding-editor.md)     | Keymap、sensor、macro/combo、入力処理                |
| 共通設定値・debounce・保存表示  | [settings write](modules/settings-write.md)     | Settings、Connection、Trackball 等                   |
| ポインティング入力変換          | [input processing](modules/input-processing.md) | Trackball                                            |
| capture・diff・復元             | [version history](modules/version-history.md)   | Keymap、Macro&Combo、Trackball、Connection、Settings |

## 判定の原則

実装を読んだだけの仕様はブラウザ検証済みではない。「要求」は実装から推定したものか明示されたものか区別する。未知の動作を正常と断定せず、現在の実装との一致だけで不具合候補を棄却しない。受け入れ済み不具合への登録には明示的な受け入れ根拠が必要。
