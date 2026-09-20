# Troubleshooting

## 範囲・根拠

- 種別: `/troubleshooting`（`Troubleshooting` タブ）の read/diagnostic/support-report 画面。device-info、watchdog、kscan、PMW3610、Devtool stack usage を扱い、floating devtool は [Debug Tool](debug-tool.md) を参照する。
- 確認: 2026-09-20、`8627e4d`。コード確認のみ。実機、clipboard permission、ELF parser、各 firmware module の UI 実測は未実施。

| 根拠 | ソースと symbol                                                                                                                                                                                                                                                                    | 根拠の内容                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| S1   | [TroubleshootingPage](../../../src/pages/TroubleshootingPage.tsx): `refreshAll`, `copySupportReport`, tab-active effect                                                                                                                                                            | 共通 refresh/report/poll stop          |
| S2   | [DeviceInfoSection](../../../src/components/troubleshooting/DeviceInfoSection.tsx): `DeviceInfoSection`                                                                                                                                                                            | build/hardware/Zephyr device status    |
| S3   | [WatchdogSection](../../../src/components/troubleshooting/WatchdogSection.tsx): `ElfUploadBar`, `handleDeleteAll`, `WatchdogSection`                                                                                                                                               | incidents、ELF、destructive paths      |
| S4   | [KscanDiagnosticsSection](../../../src/components/troubleshooting/KscanDiagnosticsSection.tsx): `handleResetStats`, `handleExpand`                                                                                                                                                 | matrix stats/pin/layout/reset          |
| S5   | [Pmw3610Section](../../../src/components/troubleshooting/Pmw3610Section.tsx)、[Pmw3610FrameViewer](../../../src/components/troubleshooting/Pmw3610FrameViewer.tsx)                                                                                                                 | sensor health/diagnostics/frame stream |
| S6   | [DevtoolStackUsageSection](../../../src/components/troubleshooting/DevtoolStackUsageSection.tsx)、[useDevtoolStackUsage](../../../src/hooks/useDevtoolStackUsage.ts): `refresh`, `setPolling`                                                                                      | stack RPC and polling                  |
| S7   | [troubleshooting page tests](../../../src/pages/__tests__/TroubleshootingPage.test.tsx)、[kscan tests](../../../src/components/troubleshooting/__tests__/KscanDiagnosticsSection.test.tsx)、[PMW tests](../../../src/components/troubleshooting/__tests__/Pmw3610Section.test.tsx) | rendering/control regression coverage  |

## 機能要求

| ID       | できるべきこと                                                                                  | 出典・確度     |
| -------- | ----------------------------------------------------------------------------------------------- | -------------- |
| DIAG-R01 | firmware が提供する診断だけを section ごとに読み、unsupported と error/empty を区別して示せる   | S1–S6 から推定 |
| DIAG-R02 | support に渡す report を clipboard へ生成でき、fatal incident は任意の ELF で symbol 解決できる | S1/S3 から推定 |
| DIAG-R03 | incident/statistics/log-like data の削除、polling、frame streaming を意図して制御できる         | S3–S6 から推定 |

## 前提・状態

- 未接続時の全体 placeholder はこの Page に無く、アプリの connection gate が担う。各 section は subsystem/module 未提供なら module 名/リンク付き Not Available、提供済みなら loading/empty/error/data を独立表示する。
- `Refresh All` は available の device info/watchdog/kscan/PMW3610/stack の refresh を同じ handler 内で開始し、前の完了を await しない。完了順は保証しない。ELF の再解析、clipboard、frame stream の開始/停止は含まない。
- support report は browser clipboard に text を書く。device report は firmware flash を変えない。watchdog deletion/stat reset の firmware 永続性は protocol の外で未確認。

## 現行の機能仕様

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

各診断sectionのRefreshも640px未満ではアイコンだけを表示し、section固有のaccessible name・無効条件・RPCは維持する。

| ID       | 前提 → 操作                                                              | 観測できる結果                                                                                                       | 保存範囲・副作用                                                                   | 根拠                                                                                         |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| DIAG-001 | `Refresh All`                                                            | 各 available section が refresh。section ごとの spinner/error                                                        | read RPC。ELF、frame、clipboard は変更しない                                       | S1                                                                                           |
| DIAG-002 | `Copy Support Report`                                                    | 成功後 2 秒 `Copied!`。device/browser/app URL と section availability/data/error を text 化                          | `navigator.clipboard.writeText`。clipboard 拒否は page 内で catch/display されない | S1、[troubleshootingReport](../../../src/lib/troubleshootingReport.ts): `buildSupportReport` |
| DIAG-003 | Device Info を refresh                                                   | build/hardware/ZMK config と named Zephyr devices。空名 device は非表示、literal `empty` は not-ready badge から除外 | read only                                                                          | S2                                                                                           |
| DIAG-004 | Watchdog source Central/Peripheral 1 を選び Refresh                      | capacity/stored/dropped、freeze/crash/reset incident table                                                           | read RPC。source 切替は delete/report の保存先ではない                             | S3                                                                                           |
| DIAG-005 | crash あり → ELF upload / Change ELF / Remove ELF                        | PC/LR を function+offset+file:line に追加表示（解決できる時）                                                        | selected File を browser memory で parse。firmware/clipboardへ upload しない       | S3、[useElfAnalysis](../../../src/hooks/useElfAnalysis.ts): `loadFile`, `resolve`, `clear`   |
| DIAG-006 | incident one-row Delete / `Delete all` → confirm                         | row delete は直ちに RPC。all は native-style confirm card の Cancel/`Delete all`                                     | incident store を firmware RPC で mutate。recording paused は削除で resume し得る  | S3                                                                                           |
| DIAG-007 | KScan の expand/Refresh、pin/keyboard view、`Reset statistics` → confirm | driver、matrix stats、position/pin activity。Cancel は stats 不変                                                    | stats reset RPC。layout/pin の表示だけは write しない                              | S4                                                                                           |
| DIAG-008 | PMW3610 `Read surface diagnostics`、frame side/capture/start/stop        | ready/product/revision/init, SQUAL/shutter/pixels、SQUAL health 文言、frame viewer                                   | diagnostics/frame RPC。stream の開始/停止は sensor setting の保存ではない          | S5                                                                                           |
| DIAG-009 | Stack Usage `Auto-refresh` と 1/3/5/10 s                                 | stack high-water table と 60/80/90% color/badge                                                                      | browser state の poll timer。非 active tab になると polling OFF                    | S1/S6                                                                                        |

## 代表ユーザーフロー

### F1: safe support report（DIAG-001/002/003）

1. Troubleshooting を開き、各 section の available/not available/loading/error を記録する。
2. `Refresh All` を押し、完了した section と error の section を別々に記録する。全 section 成功とは推定しない。
3. `Copy Support Report` を押して `Copied!` を確認し、clipboard を読み取る許可がある場合だけ text が更新されたことを確認する。機密 device ID/URL を外部送信しない。

### F2: watchdog と ELF（DIAG-004/005/006）

1. Crash incident がある source を選び、ID/PC/LR を記録する。
2. 対応する local `.elf` を Upload して symbol/line-info の表示を確認し、別 build ELF では resolution が正しいと断定しない。
3. `Delete all` を開き Cancel → incident 数を比較する。承認して削除する実機試験は data loss を伴うため別途許可が必要。

### F3: input diagnostics の境界（DIAG-007/008/009）

1. KScan を expand して位置を pin、keyboard view で交互に選び、pinned markers と Reset statistics confirmation を確認する。
2. PMW3610 は init error/No sensors/diagnostics を区別し、side 19–22 を選び Capture once と stream start/stop を試す。
3. Stack Usage の Auto-refresh を ON、1s を選んだ後、別 tab へ移動し polling が停止することを確認する。

## 不変条件

- DIAG-I01: unavailable module を「正常」と表示しない。Not Available と module enable hint を比較する（S2–S6）。
- DIAG-I02: `Copy Support Report` は incidentを削除、ELFを保存、device setting を変更しない（S1）。
- DIAG-I03: watchdog `Delete all` の Cancel は delete RPC を呼ばない（S3）。
- DIAG-I04: tab 非 active 時に Stack Usage polling を継続しない（S1/S6）。
- DIAG-I05: frame stream Start/Stop は view の同一 device index/side に向け、side だけの変更で設定値を保存しない（S5）。

## エラーと復帰

- Section error は SectionCard 内の red error。Refresh を再試行する。unsupported は error ではなく module install/firmware enable の案内。
- clipboard write rejection は `copySupportReport` が捕捉しないため `Copied!` の未表示/console rejection の可能性がある。clipboard 実測は未実施。
- ELF parser error は upload bar に残り、別 file/Remove ELF で復帰できる。ELF 解決不能は crash がない証拠ではない。
- Kscan reset、watchdog delete、PMW stream は RPC failure なら section error/state確認を行う。partial mutation の rollback は保証しない。

## 探索の観点

1. subsystem 未提供、read error、empty data、遅い refresh、複数 section の混在。
2. watchdog capacity full/recording paused、row delete と all Cancel/confirm、Central/Peripheral の切替。
3. malformed/wrong-build ELF、line info 無し ELF、copy permission denied。
4. Kscan key/pin の rapid toggle、PMW 連続 start/stop と side change、tab 離脱中 polling。
5. narrow viewport/long device name/report の横 overflow と destructive controls。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- 実機各 module、clipboard denied、ELF size/error、watchdog/stat reset persistence、PMW hardware frame の精度は未検証。
- support report の clipboard failure feedback がない現行実装の望ましさ/受容根拠は未確認。
