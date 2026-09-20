# Developer Guide

## 範囲・根拠

`/developer-guide` 配下の静的開発者資料の route family と navigation/rendering を対象にする。接続不要 route と theme/language の共通契約は[共通画面](../modules/app-shell.md)を参照する。キーマップ編集操作の契約は[共通 binding editor](../modules/binding-editor.md)を参照し、この guide は firmware 設定例を提示するのみで keyboard を編集しない。コード確認: 2026-09-20、`8627e4d`。外部リンク、画像、実機手順は未実測。

| 根拠 | ソース / symbol                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [App](../../../src/App.tsx): `AppRouter`, developer guide route fallback                                                                                          |
| S2   | [guide content](../../../src/content/developerGuide.ts): `developerGuidePages`, `developerGuideRoutes`, `getDeveloperGuidePageDefinition`, `isDeveloperGuidePath` |
| S3   | [DeveloperGuidePage](../../../src/components/developerGuide/DeveloperGuidePage.tsx): `DeveloperGuidePage`, `Section`, `handleGuideNavigation`                     |
| S4   | [guide tests](../../../src/components/developerGuide/__tests__/DeveloperGuidePage.test.tsx), [App routing tests](../../../src/__tests__/App.test.tsx)             |

## 機能要求

| ID        | できるべきこと                                                                                                 | 出典・確度     |
| --------- | -------------------------------------------------------------------------------------------------------------- | -------------- |
| GUIDE-R01 | keyboard/transport 非対応の browser でも、全 guide route family とその設定・参照情報を閲覧できる               | S1/S2 から推定 |
| GUIDE-R02 | desktop/mobile navigation、breadcrumb、page previous/next、heading anchor が現在 page を保って移動できる       | S2/S3 から推定 |
| GUIDE-R03 | code/example/外部 reference は説明情報であり、表示・navigation だけで firmware または外部 account を変更しない | S2/S3 から推定 |

## 前提・状態

`isDeveloperGuidePath()` は `/developer-guide` とその prefix を guide と判定する。既知 page は content record の 11 routes、未知の prefix（例 `/developer-guide/typo`）は AppRouter が root definition を fallback して同じ URL のまま表示する。guide は keyboard providers 外で mount され、connection/loading/unsupported device state はない。日本語/英語 definition は language state により選び、mobile は閉じた `<details>` menu、desktop は常時 sidebar を使う。

| route family          | 現行 route                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| introduction / levels | `/developer-guide`, `/level-1`, `/level-2`, `/level-3`                                                      |
| module guides         | `/modules/keymap`, `/modules/trackball`, `/modules/connection`, `/modules/settings`, `/modules/diagnostics` |
| reference / recovery  | `/reference/keyboard-config`, `/troubleshooting`                                                            |

## 現行の機能仕様

| ID        | 前提 → 操作                                              | 観測できる結果                                                                                                         | 保存範囲・副作用                                            | 根拠        |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------- |
| GUIDE-001 | known guide URL を直接開く                               | connection splash を経ず selected page definition を render                                                            | keyboard RPC、device/browser storage write はしない         | S1/S2/S4    |
| GUIDE-002 | unknown `/developer-guide/*` URL                         | root page definition を fallback 表示する                                                                              | URL 自体を canonicalize しない                              | S1/S2       |
| GUIDE-003 | desktop sidebar / mobile `Menu`                          | active route に `aria-current=page`。mobile link は details を閉じ、history push/popstate/scroll top で同一 SPA 内移動 | browser history のみ                                        | S3/S4       |
| GUIDE-004 | heading link / `On this page`                            | page content の heading id に `#id` anchor、desktop/mobile TOC を表示                                                  | browser hash scroll。content を変更しない                   | S3          |
| GUIDE-005 | language 日本語/English、theme toggle                    | content definition、button 表示、light/dark icon を切替                                                                | language/theme persistence は app-shell の契約              | S1/S2/S3/S4 |
| GUIDE-006 | code/table/callout/image/flow/features/levels/link group | content type ごとに static rendering。`src` 不在 image は placeholder と alt/caption                                   | link は通常 anchor。external firmware/GitHub URL を開くのみ | S2/S3       |
| GUIDE-007 | previous/next、`Back to DYA Studio`                      | related page link または `/` link を表示                                                                               | normal browser navigation。keyboard state を保存/破棄しない | S2/S3/S4    |

## 代表ユーザーフロー

1. 未接続 browser で root、各 level、各 modules、reference、troubleshooting の URL を直接開き、connection UI を出さず title/content を表示することを確認する（GUIDE-001）。
2. mobile width で `Menu` を開き nested module page を押す。details が閉じ、URL・active label・scroll top が更新することを確認する（GUIDE-003）。
3. heading anchor、previous/next、breadcrumb、footer の各 link を遷移して history Back で戻る（GUIDE-004/007）。
4. 日本語/English、light/dark を切替え、code/table/placeholder image の可読性を確認する（GUIDE-005/006）。

## 不変条件

- GUIDE-I01: guide route を開くために Web Serial、Bluetooth、接続 keyboard を要求しない（S1）。
- GUIDE-I02: guide internal navigation は `/developer-guide` prefix だけを SPA intercept し、外部 link/anchor の意味を置換しない（S3）。
- GUIDE-I03: mobile で page link を選んだ後に menu は開いたまま残らない（S3/S4）。
- GUIDE-I04: guide の設定例を表示・コピー・リンクするだけでは firmware/device に write しない（S2/S3）。

## エラーと復帰

route prefix の未知 page は root content fallback で、not-found/error screen はない。画像 `src` が未定義なら placeholder を render する。外部 GitHub/ZMK links の失敗、code example の正確性、リンク先の version はこの app が検出も retry もしない。language が ja/en 以外なら App の language provider が渡す definition の扱いは現状 route function では en 側に落ちる。

## 探索の観点

- 11 known routes と typo prefix、reload、Back/Forward、deep heading hash。
- mobile details/menu close、desktop active styling、long Japanese/English code と narrow width overflow。
- all external links、image assets/placeholder、theme と locale を切替えた時の navigation label。
- sample config を実 firmware に適用する前後は別環境・別 task とし、guide 表示の pass と混同しない。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

全 route/asset の browser 実測、external URL の可用性、firmware sample の build/実機互換性は未検証。unknown guide prefix を root に silently fallback することが意図した 404 UX かは、実装事実として記録するが製品承認は確認できない。
