# Trackball

## 範囲・根拠

- 種別: `/trackball`（`Trackball` タブ）。runtime input processor と PMW3610 custom settings の編集画面。共通 RPC は [Runtime input processing](../modules/input-processing.md)、capture/restore の保存先は [version history](../modules/version-history.md) を参照する。
- 確認: 2026-09-20、`8627e4d`。コード確認のみ。実機 sensor と PMW3610 firmware UI は未実測。

| 根拠 | ソースと symbol                                                                                                                                  | 根拠の内容                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| S1   | [TrackballPage](../../../src/pages/TrackballPage.tsx): `handleScalingValueChange`, `handleRotation*`, `handleTempLayer*`, `handleAxisSnap*`, JSX | processor controls と debounce   |
| S2   | [useRuntimeInputProcessor](../../../src/hooks/useRuntimeInputProcessor.ts): `set*`, `loadProcessors`                                             | processor RPC/error/notification |
| S3   | [Trackball page tests](../../../src/pages/__tests__/TrackballPage.test.tsx)                                                                      | page-level state の回帰根拠      |
| S4   | [AdvancedSettingsSection](../../../src/components/AdvancedSettingsSection.tsx)、[useCustomSettings](../../../src/hooks/useCustomSettings.ts)     | PMW3610 custom-settings consumer |

## 機能要求

| ID        | できるべきこと                                                                      | 出典・確度     |
| --------- | ----------------------------------------------------------------------------------- | -------------- |
| TRACK-R01 | 対象 processor を選び、sensitivity、rotation、layer、axis と座標変換を調整できる    | S1/S2 から推定 |
| TRACK-R02 | PMW3610 driver が custom settings を報告する時だけ、その section を選択・編集できる | S1/S4 から推定 |

## 前提・状態

- `cormoran_rip` subsystem がない時は `Runtime input processor subsystem is not available...`、0 processors は `No processors found`。processor と keymap layer は非同期に読込む。
- 左 pane は Processors と PMW3610 Drivers。right pane は選択 processor または driver settings。一つを選ぶと他方の detail は表示しない。
- field は `useDebouncedSave` で pending 表示を先に変え、`MEMORY_WRITE_DEBOUNCE_MS`（1,500 ms）の quiet 後に processor RPC を送る。コードは request の RAM/flash を区別しないため、`Versions` は firmware 保存ではなく captured version history とする。

UI の数値範囲は scaling 0.01–10、rotation -180–180°、temporary layer activation 0–1000 ms / deactivation 0–2000 ms、axis snap threshold 0–1000 / timeout 0–600 ms。HTML input の min/max は firmware 検証の保証ではない。直接入力と slider/step 操作の差は探索対象とする。

## 現行の機能仕様

| ID        | 前提 → 操作                                                     | 観測できる結果                                              | 保存範囲・副作用                                                                                                         | 根拠  |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----- |
| TRACK-001 | `Reload processors` / mount                                     | Processors list、layer grid（active/temp ring）を再読込     | read RPC。tab 往復だけでは明示 reload しない                                                                             | S1/S2 |
| TRACK-002 | scaling slider、`-`/`+`、数値 input                             | 0.01–10.00 の対数 slider、表示値は fraction へ変換          | debounce 後に processor ID の multiplier/divisor RPC。fraction は約分                                                    | S1/S2 |
| TRACK-003 | Rotation switch、`-`/`+`、degree input                          | OFF は 0°、ON は -180–180° の input                         | debounce write。OFF 前の非0 rotation を復元する state はない                                                             | S1    |
| TRACK-004 | Active on Layers を All / Specific にし layer checkbox を変える | bitmask 0 は All、各 layer の active cell が変化            | debounce write。layer ID bit 演算は 32-bit 範囲に依存                                                                    | S1/S2 |
| TRACK-005 | Temporary Layer、activation/deactivation delay を変更           | enable、target layer、ms controls                           | debounce write。入力値の firmware validation は UI だけでは保証しない                                                    | S1/S2 |
| TRACK-006 | Axis snap の switch/mode/threshold/timeout を変更               | enable 時既定 Y、mode X/Y、数値 controls                    | debounce write。OFF は NONE                                                                                              | S1/S2 |
| TRACK-007 | X invert、Y invert、XY to scroll、XY swap を toggle             | switch の checked state が変わる                            | debounce write。複数 toggle の原子性はない                                                                               | S1/S2 |
| TRACK-008 | PMW3610 driver row を選ぶ                                       | `CustomSettingsSectionCard` の当該 custom subsystem section | custom-settings subsystem が無い/section 0 の場合は編集不能。個別 field の保存契約は S4                                  | S1/S4 |
| TRACK-009 | `Versions` から snapshot を選ぶ                                 | diff modal を経て restore の入口                            | IndexedDB 等の履歴契約は [version history](../modules/version-history.md)。processor firmware default reset は提供しない | S1    |

## 代表ユーザーフロー

### F1: processor tuning（TRACK-001/002/003/007）

1. 接続して Trackball を開き、processor 名、layer grid、初期 scaling/rotation を記録する。
2. scaling を `+` で一段変更して debounce 完了を待ち、Reload 後の表示を比較する。
3. Rotation を ON、適当な degree にしてから OFF にし、表示が 0° になることを確認する。
4. X/Y/scroll/swap は一つずつ変え、対象外 toggle が変化しないことを比較して元へ戻す。

### F2: layer / axis boundary（TRACK-004/005/006）

1. All → Specific で一つの layer を選び、grid と selected processor の範囲を記録する。
2. Temporary Layer を ON、target と delay を変更する。keymap layer 0/最終 layer で選択肢を確認する。
3. Axis snap を ON/OFF、mode X/Y、threshold と timeout の最小/最大 UI 値で試す。firmware の有効範囲は RPC error と Reload で確認する。

### F3: PMW3610 availability（TRACK-008）

1. PMW3610 Drivers の `Reload`。unavailable、loading、`No pmw3610 driver settings...`、section list を区別して記録する。
2. section を選び、dirty dot と custom setting の保存/取消を該当 module の実装で確認する。ここでは flash 成功を推定しない。

## 不変条件

- TRACK-I01: processor 切替時に前 processor の pending debounce を新 processor に送らない。切替前後の ID/値を比較する（S1）。
- TRACK-I02: activeLayers 0 は「layer 0 だけ」ではなく All layers（S1 `LayerGrid`）。
- TRACK-I03: scale の divisor 0 で UI が Infinity/NaN を表示しない（S1/S2）。
- TRACK-I04: PMW3610 custom settings が無い時に unrelated custom subsystem をこの page に出さない（S1）。

## エラーと復帰

- input processor `error` は red alert。RPC error は optimistic display の後でも起こり得るので `Reload processors` で current notification を確認する（S1/S2）。
- PMW3610 custom settings は unavailable/no section/loading/error を別表示にする。driver write の失敗復帰は S4 の契約で、Trackball 固有に保証しない。
- `Versions` restore 中は busy/disabled。restore failure と device partial state の UX は version history の未検証事項。

## 探索の観点

1. debounce 中の processor 切替、Reload、tab 往復、接続切断。
2. scaling 0.01/10、rotation -180/180、All/Specific、32 layer 境界。
3. 全座標 switch の組合せと axis snap を同時に変更した時の表示/RPC 順序。
4. processor 0 件、複数 processor、custom setting 0/複数 section、狭い表示。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- processor RPC の power-cycle persistence、sensor の物理的 tracking 品質、custom settings の flash 境界、遅延 failure rollback は未検証。
