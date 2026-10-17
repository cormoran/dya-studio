# DYA Studio 紹介

## 範囲・根拠

公開 route `/about`。新規利用者に機能・firmware・接続条件・始め方を説明する。既存 `/` は接続の入口、接続後の Home は製品ギャラリー・最新リリースとして維持する。要求は [#306](https://github.com/cormoran/dya-studio/issues/306) と #307–310。確認日: 2026-10-18。コード確認・公式資料調査と実機の動作確認は別である。

| 根拠 | ソース / symbol                                                                                                                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [AboutPage](../../../src/pages/AboutPage.tsx)、[about content](../../../src/content/about.ts): 三言語の本文、画像、対応表、参照資料                                                                                                                                                                         |
| S2   | [App](../../../src/App.tsx): 公開 route と接続 session の保持                                                                                                                                                                                                                                               |
| S3   | [USB](../../../src/lib/transport/usb.ts) `connect`, `shouldUseWebUsbForUsbConnection`、[WebUSB](../../../src/lib/transport/webUsb.ts): desktop Serial と Android Chrome WebUSB の分岐                                                                                                                       |
| S4   | [SplashScreen](../../../src/components/SplashScreen.tsx)、[DeviceConnection](../../../src/components/DeviceConnection.tsx): notice、明示接続、自動再接続                                                                                                                                                    |
| S5   | [SEO](../../../src/lib/seo.ts)、[sitemap](../../../public/sitemap.xml)                                                                                                                                                                                                                                      |
| S6   | [ZMK Studio 公式](https://zmk.dev/docs/features/studio)、[Chrome Serial](https://developer.chrome.com/docs/capabilities/serial)、[Chrome Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth): API の前提。2026-10-18 閲覧。ブラウザ API 対応を ZMK の BLE transport の動作保証へ拡大しない |
| S7   | [guide](../../../src/content/developerGuide.ts)、[Home](../../../src/pages/HomePage.tsx)、[README](../../../README.md): 既存の説明・画像を調査。README の一律 desktop BLE 対応表を検証済みとして転記しない                                                                                                  |

## 機能要求

| ID        | できるべきこと                                                               | 出典・確度            |
| --------- | ---------------------------------------------------------------------------- | --------------------- |
| ABOUT-R01 | 接続 API や device なしに機能・対応条件を読める                              | #306/307/308 明示要求 |
| ABOUT-R02 | 標準 Studio の keymap 機能と追加 firmware subsystem が必要な機能を区別する   | 同上                  |
| ABOUT-R03 | 接続の入口・guide・release notes へ移動し、既存 session を不用意に破棄しない | #309 明示要求         |

## 前提・状態

- direct `/about` は ready。Web Serial / Bluetooth が存在しなくても本文を表示し、保存済み Demo/serial session があっても新規に device provider を起動しない。
- 接続画面から通常クリックで訪れた場合、既存 provider と接続試行は保持する。connecting / reconnecting は背後で継続し得る。紹介への移動自体は接続開始・中止・再試行ではない。戻るとその時点の状態を表示する。
- connected から通常クリックで閲覧する場合、session と訪問済みタブの編集状態を保持する。案内ページから戻る操作は `/` の Home。Back は実際の履歴へ戻る。
- 固有の loading / dirty / saving / locked / empty はない。静的本文は capability 判定結果ではない。

## 現行の機能仕様

| ID        | 前提 → 操作                                         | 観測できる結果                                                                                                                                                                                                                                                                                 | 保存範囲・副作用                                                                                                                   | 根拠        |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| ABOUT-001 | `/about` を直接開く・Reload                         | 概要、機能、キーボード・firmware 条件、環境別接続表、始め方、資料へのリンクを表示                                                                                                                                                                                                              | 新規接続・権限要求・device/account 書込みなし。表示設定は共通仕様。紹介中は保存済み Abyss 認証の自動更新を停止（進行済み要求は別） | S1/S2       |
| ABOUT-002 | 機能を読む                                          | 標準 Studio 対応の keymap/layer 編集と、runtime macro/combo・trackball・接続先/設定等の追加 subsystem を区別。DYA Dash/DYA2 も含め機種名で全機能を保証しない。接続後 capability が最終条件                                                                                                     | 読み取りのみ                                                                                                                       | S1/S3/S6/S7 |
| ABOUT-003 | 対応表を読む                                        | 閲覧/Demo と実機 USB/BLE を区別。Windows/macOS/ChromeOS desktop Chrome/Edge、Linux、Android Chrome、iOS/iPadOS、Firefox/Safari の条件と未確認を明記。Android USB は WebUSB と CDC interface claim の制約。BLE は browser API があっても firmware/OS 組合せが必要。資料確認日と実機未検証を表示 | 読み取りのみ                                                                                                                       | S1/S3/S6    |
| ABOUT-004 | 始め方・接続へのリンクを選ぶ                        | `/` へ通常リンクで移動。USB/BLE/Demo は既存 splash の明示操作で開始。notice、API 非対応のエラー案内、保存済み session の再接続と Cancel は既存契約                                                                                                                                             | link 自体は接続を明示実行しないが、接続画面の初回 mount は既存自動再接続を開始し得る                                               | S2/S4       |
| ABOUT-005 | splash / 接続後 Home → 紹介 → 戻る / Back / Forward | URL と本文が一致。通常クリックは SPA、既存 session・編集を保持。中/修飾クリック・コピー・別タブは native href を使用                                                                                                                                                                           | 未確定編集の Save/Discard を呼ばない。別タブ/Reload は新しいアプリ instance                                                        | S1/S2/S4    |
| ABOUT-006 | guide / release notes を選ぶ                        | 通常 href で該当公開 route へ移動。OAuth callback の code/state を正規化で消さない                                                                                                                                                                                                             | 閲覧で device/account 書込みなし                                                                                                   | S1/S2       |
| ABOUT-007 | 言語・テーマを選ぶ                                  | English/日本語/中文の全本文、見出し、表、画像 alt/caption、CTA と metadata が対応。欠落翻訳は型で検出し英語混在で補わない。Light/Dark/Pop/Neutral、狭幅は自然な折返しと表内横スクロール。リンクと共通 menu に keyboard focus                                                                   | SHELL-005/006 の localStorage のみ                                                                                                 | S1/S5       |
| ABOUT-008 | direct / SPA / history / 言語変更                   | ページ固有 title/description/canonical/OGP。canonical は本番 `/about` のみで query/hash 除外、sitemap 掲載                                                                                                                                                                                     | 静的本文生成、言語別 URL/hreflang、検索登録は対象外                                                                                | S5          |

画像は Home の同梱 DYA2 製品写真を再利用し、製品例・出典を caption に表示。動作保証や接続中画面と誤認させない。本文データを SEO と共有し、公開対応条件の唯一の表とする。Home と README からその説明へ誘導する。

## 代表ユーザーフロー

1. API 非対応・未接続で `/about?source=test#compatibility` を開く。本文と query/hash を除外した canonical を確認（ABOUT-001/003/008）。
2. `/` → 紹介 → 接続画面へ → Demo 明示接続 → Home → 紹介 → Back。接続名と既存のタブ状態が残ることを確認（ABOUT-004/005）。
3. guide / release notes へ移動、Back/Forward/Reload 後の URL・本文・metadata を確認（ABOUT-006/008）。
4. 初期の言語/テーマを記録、3言語・4テーマを選択、desktop/390px で本文・対応表・画像・focus・menu を観測して初期値へ戻す（ABOUT-007）。

## 不変条件

- ABOUT-I01: 紹介ページの閲覧・navigation は firmware 更新、権限 picker、Save/Discard を直接実行しない（S1/S2）。既存進行中の接続処理と接続画面初回 mount は別。
- ABOUT-I02: Demo の動作を実機 flash・電源断の persistence の証拠としない。
- ABOUT-I03: 機種名やブラウザ名だけで全機能対応を宣言しない。

## エラーと復帰

固有の RPC error/retry はない。API 非対応でも説明を読める。接続エラーは `/` の原因・復帰案内へ委譲する。画像失敗時は alt と caption、外部資料の失敗時は元ページへ戻る。オフライン初回表示・storage 拒否は保証未確認。

## 探索の観点

全言語/テーマの本文・長文・表・画像・menu/focus、Pop 後の書体復帰、直接 URL と href の標準操作、接続前後の履歴、再接続/Cancel、編集保持、SEO と build の静的ファイルを確認する。

## 既知の受け入れ済み不具合

なし。

## 未解決・未検証

実機 USB/BLE、全 OS/ブラウザの組合せ、権限 picker、firmware 更新、flash/電源断、検索登録・順位、オフライン・storage 拒否は本変更のブラウザ検証だけでは証明できない。tested/blocked/not-run は PR に分離して記録する。
