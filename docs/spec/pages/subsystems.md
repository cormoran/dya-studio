# Custom Subsystems

## 範囲・根拠

- 種別: firmware が advertises した custom subsystem と外部 Web UI を列挙するページ。入口は [App](../../../src/App.tsx) の `getTabs` の `subsystems`。
- 確認: 2026-09-20、コードと page test の確認のみ。外部 URL は開いていない。
- 関連仕様: 接続状態は [device session](../modules/device-session.md)。既に dedicated UI を持つ subsystem の機能は各ページ仕様へ分離し、本ページは発見と外部遷移だけを扱う。

| 根拠 | ソース / symbol                                                                                                                                    | 確認内容                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| S1   | [CustomSubsystemsPage](../../../src/pages/CustomSubsystemsPage.tsx): `SUPPORTED_SUBSYSTEM_IDENTIFIERS`, `CustomSubsystemsPage`, `SubsystemCard`    | 分類、表示、URL navigation                          |
| S2   | [CustomSubsystemsPage](../../../src/pages/CustomSubsystemsPage.tsx): `isValidUrl`, `getTrustedUrls`, `saveTrustedUrl`, `ExternalLinkWarningDialog` | URL validation と localStorage trust                |
| S3   | [demo registry](../../../src/lib/transport/demo-subsystems.ts): `DEMO_SUBSYSTEMS`, `setDemoSubsystemEnabled`                                       | Demo toggle と reconnection 前提                    |
| S4   | [CustomSubsystemsPage tests](../../../src/pages/__tests__/CustomSubsystemsPage.test.tsx)                                                           | grouping、URL warning、disconnect-before-navigation |

## 機能要求

| ID      | できるべきこと                                                                    | 出典・確度     |
| ------- | --------------------------------------------------------------------------------- | -------------- |
| SUB-R01 | firmware が報告した subsystem の identifier、index、Web UI URL を確認できる       | S1 から推定    |
| SUB-R02 | firmware metadata の外部 URL を、初回は確認してから開ける                         | S1/S2 から推定 |
| SUB-R03 | Demo では advertised subsystem の組合せを変更し、再接続後に機能可用性を検証できる | S1/S3 から推定 |

## 前提・状態

- ready: `zmkApp.state.customSubsystems?.subsystems` を使用する。空または未取得は `No custom subsystems available...` を表示する。loading 専用表示はない。
- supported: `SUPPORTED_SUBSYSTEM_IDENTIFIERS` にある既知 feature は折りたたみ `Already supported by DYA Studio` に置き、専用タブがない Fast Keymap も transparent 対応としてここに入る。
- unsupported: dedicated UI がない item を先に card 表示する。`uiUrl` が空なら `No web UI available for this subsystem.`。
- Demo: 接続 label が `Demo` の場合だけ `Demo: Subsystem Toggles`。checkbox 変更は直ちに browser state を変えるが、advertisement の反映は Reconnect 後。
- trusted / untrusted: http / https の文字列だけ trust set に保持する。不正 URL は trust storage から除外されるが、card の metadata URL が invalid のときの link click 挙動は未検証。

## 現行の機能仕様

| ID      | 前提 → 操作                                   | 観測できる結果                                                                                                        | 保存範囲・副作用                                                                                        | 根拠                 |
| ------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| SUB-001 | subsystem list あり                           | identifier、firmware index、各 Web UI URL を card に表示。dedicated UI あり/なしで group を分ける                     | 読込み。対応判定は app 内の static identifier set                                                       | S1/S4                |
| SUB-002 | list 空                                       | firmware が custom subsystem を提供しない旨の empty state                                                             | 書込みなし                                                                                              | S1/S4                |
| SUB-003 | untrusted Web UI URL を選ぶ                   | External Link Warning に URL、Security Notice、Cancel / Open、`Trust this URL and don't warn me again` を表示         | dialog を開くだけでは接続も storage も変更しない                                                        | S1/S2/S4             |
| SUB-004 | warning → Cancel、Close、overlay click        | warning を閉じ、外部 navigation をしない                                                                              | trust を保存しない                                                                                      | S1 `handleCancel`/S2 |
| SUB-005 | warning → Open                                | `zmkApp.disconnect()` 後に `navigateTo(url)`。checkbox ON なら URL を trust set に保存し次回は warning を省略         | 接続を切断し外部 URL へ同一ページ navigation。trust は `dya-studio-trusted-subsystem-urls` localStorage | S1/S2/S4             |
| SUB-006 | trusted URL を選ぶ                            | warning を出さず SUB-005 と同じ disconnect → navigation                                                               | trust entry は URL 文字列単位、firmware author / host 単位ではない                                      | S1/S2                |
| SUB-007 | Demo → checkbox を変更 → `Reconnect to apply` | enable/disable を localStorage に保存し demo connection を再作成。button は reconnect 中 disabled / `Reconnecting...` | `dya-studio-demo-subsystem-overrides`。現在 session の subsystem list は checkbox だけでは更新しない    | S1/S3                |

## 代表ユーザーフロー

### F1: 外部 UI を安全に開く／中止する（SUB-003–006）

1. 任意 subsystem の URL を選び、表示された URL が firmware metadata 由来であることを確認する。
2. Cancel、Close、overlay click をそれぞれ試し、外部遷移や trust 保存がないことを確認する。
3. 信頼できる author と URL をユーザーが確認した場合だけ `Open` を選ぶ。必要なら checkbox ON にする。
4. Studio が disconnect してから navigation することを確認し、外部ページの安全性・権限・データ送信は Studio の保証外として扱う。

### F2: Demo feature availability を作る（SUB-007）

1. Demo に接続し toggle の初期値を記録する。Fast Keymap は fast loading path 用であることを確認する。
2. 一つを切替え、list がまだ以前の advertisement を表示することを確認する。
3. `Reconnect to apply` を選び、再接続後の list と対応 page の unavailable / available state を確認する。
4. 初期条件へ戻す場合も toggle → reconnect を行う。

## 不変条件

- SUB-I01: supported の identifier を unsupported external feature として二重に主要表示しない（S1）。
- SUB-I02: Open の前に trust されていない URL は user confirmation を要求し、Cancel / Close / overlay click では disconnect / navigation / trust 保存をしない（S1/S2）。
- SUB-I03: URL を trust しても firmware author、同 host の別 URL、将来の URL を信頼済みにしない（S2）。
- SUB-I04: Demo checkbox だけで現在の接続が発見済み subsystem list を更新したと扱わない。再接続が反映境界である（S1/S3）。

## エラーと復帰

- localStorage read/write error は catch して無視する。trust / demo override の保持失敗は UI に表示されず、次回 warning / default に戻る可能性がある。
- `onConnect("demo")` が失敗しても `reconnecting` state は finally で戻る。subsystem list がどの状態になるかの page 固有 error 表示はない。
- external navigation の失敗、URL のネットワークエラー、disconnect failure の可視性と順序保証は未検証。元の Studio へ戻って改めて接続する。

## 探索の観点

1. 空、全 supported、unsupported + 複数 URL、同 identifier の複数 index を比較する。
2. http / https、不正 URL、trust checkbox ON/OFF、localStorage 消去後の warning を比較する。
3. warning の Escape、overlay、Close、Cancel、Open を別々に試す。
4. Demo toggle の複数変更、Fast Keymap の初期 OFF、Reconnect 中の再操作、再接続後の Keymap を確認する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

外部 URL の実訪問、popup/同一ページ遷移のブラウザ差、invalid metadata URL の click、disconnect failure、storage 拒否、実 firmware の discovery timing は未検証。metadata URL が表示されたことは安全性の承認根拠ではない。
