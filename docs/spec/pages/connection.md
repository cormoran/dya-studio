# Connection

## 範囲・根拠

- 種別: 接続済みキーボードの BLE profile、出力優先度、default layer、OS detection を表示・変更するページ。入口は [App](../../../src/App.tsx) の `getTabs` の `connection`。
- 確認: 2026-09-20、`8627e4d`、コードと unit test の確認のみ。UI 実測はしていない。
- 関連仕様: 接続の開始・再接続は [device session](../modules/device-session.md)、タブ可用性は [app shell](../modules/app-shell.md)。

| 根拠 | ソース / symbol                                                                                                                    | 確認内容                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| S1   | [ConnectionPage](../../../src/pages/ConnectionPage.tsx): `ConnectionPage`, `reload`, `handleUnpair`, `confirmOutputPriorityChange` | page 操作、確認 dialog、結合カード      |
| S2   | [BLE profiles hook](../../../src/hooks/useBLEProfiles.ts): `useBLEProfiles`                                                        | profile / output-priority RPC と再読込  |
| S3   | [default layer hook](../../../src/hooks/useDefaultLayer.ts): `useDefaultLayer`                                                     | endpoint / OS layer state と書込み      |
| S4   | [OS detection hook](../../../src/hooks/useOsDetection.ts): `useOsDetection`, `POLL_INTERVAL_MS`                                    | 5 秒 poll、BLE override                 |
| S5   | [ConnectionPage tests](../../../src/pages/__tests__/ConnectionPage.test.tsx)                                                       | unavailable、結合カード、確認操作の根拠 |

## 機能要求

| ID       | できるべきこと                                                                  | 出典・確度     |
| -------- | ------------------------------------------------------------------------------- | -------------- |
| CONN-R01 | 利用可能な接続 target ごとに profile と default layer を区別して管理できる      | S1–S3 から推定 |
| CONN-R02 | OS detection が不確かな場合も、検出値と BLE override を混同せず確認・変更できる | S1/S4 から推定 |
| CONN-R03 | 接続断を招き得る output priority や unpair を明示確認の上で実行できる           | S1/S2 から推定 |

## 前提・状態

- 未接続: header は表示されるが、profile card、Refresh、Versions、設定操作は表示されない。接続開始は [device session](../modules/device-session.md) へ戻る。
- loading: `Loading profiles...` または Refresh の spinner。hook は各 RPC 中に全操作を無効化する。default-layer と OS detection は各々別の availability / loading を持つ。
- ready: BLE management、default layer、OS detection で得た情報を `mergeConnectionCards` で USB と BLE card に結合する。BLE management がなくても default-layer / OS-detection 由来の BLE 行は描画し得る（S5）。
- unsupported: BLE management / default layer の未提供は各説明と導入モジュール URL を表示する。OS detection 非提供時は OS row を描画しない。
- error: BLE hook の `error` は上部 alert に表示する。default-layer / OS detection の個別 error は ConnectionPage が明示表示しないため、画面復帰保証はない。

## 現行の機能仕様

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID       | 前提 → 操作                                                                     | 観測できる結果                                                                                                         | 保存範囲・副作用                                                            | 根拠                 |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------- |
| CONN-001 | 接続済み → `Refresh`                                                            | profile、priority、OS、default-layer、layer name を並列に再取得し、取得後 version を capture する                      | 読込み。未保存変更を破棄するかは各 firmware RPC の契約で未確認              | S1 `reload`          |
| CONN-002 | BLE management 対応 → `USB` / `BLE` output priority を選ぶ → warning で Confirm | `Changing the output priority may disconnect...` を確認後に set RPC、成功時に priority を再読込                        | デバイス側設定。接続断時は手動 reconnect が必要と表示する                   | S1/S2                |
| CONN-003 | pair 済み BLE profile → edit icon → 名を入力 → Save                             | 最大 31 文字の名前編集を送信し、成功時 profiles を再読込                                                               | デバイス側 profile 名。Cancel は入力 state を捨てて RPC を送らない          | S1/S2                |
| CONN-004 | pair 済み BLE profile → `Unpair` → native confirm を承認                        | profile unpair RPC を送る。Cancel なら RPC を送らない                                                                  | bond を消す破壊的操作。失敗時は上部 alert と再試行可能な card を残す        | S1 `handleUnpair`/S2 |
| CONN-005 | 非 active BLE profile → `Switch`                                                | 対象 profile を active にする RPC を送る。active profile の Switch は無効                                              | デバイス接続先を変える。再接続・表示反映の時点は firmware 依存              | S1/S2                |
| CONN-006 | default layer 対応 → USB / BLE target の `Default Layer` を選ぶ                 | endpoint value を更新した state が返れば select と Resolved Default Layer が更新される。`Follow OS detection` も選べる | デバイス default-layer subsystem。flash/RAM の詳細はこの hook から未確認    | S1/S3                |
| CONN-007 | OS detection 対応 → BLE `OS override` を選ぶ                                    | auto / Windows / macOS / Linux / iOS / Android の override を送信後、全 state を再取得                                 | デバイス OS-detection subsystem。USB は検出 badge のみで override UI はない | S1/S4                |
| CONN-008 | default layer 対応 → Per-OS Default Layers の OS ごと select を選ぶ             | 選んだ OS の layer state を更新。endpoint が Follow OS detection のときに使う旨を表示                                  | デバイス default-layer subsystem                                            | S1/S3                |
| CONN-009 | OS detection 対応のまま待つ                                                     | `getState` を重複実行せず約 5 秒ごとに再取得する                                                                       | poll のみ。検出の揺れは自動補正しない                                       | S4                   |

## 代表ユーザーフロー

### F1: BLE profile 名を変更する（CONN-003）

1. 接続済みで pair 済み profile を開き、現在名・index・active 状態を記録する。
2. Edit name → 仮名 → `Save name`。再描画後に同じ profile の名前を確認する。
3. もう一度編集し `Cancel editing`。元の表示のままで RPC を送らないことを確認する。

### F2: default layer と OS を設定する（CONN-006/007/008）

1. 対応 subsystem がある target を選び、現行の `Default Layer`、OS badge、Resolved Default Layer を記録する。
2. BLE profile の `OS override` を auto 以外へ変更し、state 再取得後の badge を確認する。
3. endpoint を `Follow OS detection` にし、同じ OS の Per-OS Default Layers を変更して resolved label を確認する。元値を復帰する。

### F3: 破壊的または切断性のある操作を中止する（CONN-002/004）

1. `Unpair` を選び、native confirm を Cancel する。profile 状態が変わらないことを確認する。
2. output priority を変更し warning を Cancel する。選択済み priority が変わらないことを確認する。
3. 実機では Confirm / unpair を勝手に実行しない。実施時は再接続手段を先に記録する。

## 不変条件

- CONN-I01: profile index を配列位置と取り違えず、name、Switch、Unpair、BLE layer / override は同じ profile index に送る（S1/S2）。
- CONN-I02: Unpair と output priority は Cancel だけでデバイス RPC を送らない（S1）。
- CONN-I03: OS detection は heuristic で、短時間の BLE 状態変動を OS の確定・接続成功と扱わない（S1/S4）。
- CONN-I04: 画面に表示される `Saved` 相当の更新だけで flash 永続化を推定しない。各 subsystem の保存契約は未確認（S2–S4）。

## エラーと復帰

- BLE RPC 失敗は page 上部の alert に hook error を表示し、Refresh または同じ操作で再試行できる。入力名は `saveProfileName` が finally で閉じるため、失敗後に残る保証はない。
- default-layer / OS-detection の失敗は hook 内 state error になるが、この page は個別 alert を render しない。Refresh で再読込し、select / badge の実値を比較する。
- output priority の Confirm 後に Studio が切断され得る。復帰は session の通常 connect 手順であり、自動再接続を保証しない。

## 探索の観点

1. BLE management あり / なし × default layer あり / なし × OS detection あり / なしで card と warning を比較する。
2. profile name の空文字、31 文字境界、Save 中 Cancel、Switch 中 Refresh。
3. pair 済み / open / active / USB active の結合状態で同じ index の layer と override がずれないか。
4. BLE OS detection の接続直後 5 秒間の poll で badge と resolved layer が不自然に確定表示されないか。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

実機での BLE heuristic、各 RPC の flash/RAM 境界、切断後の priority 実効、Version restore の write 範囲、default-layer / OS-detection error の可視性は未検証。ページのコード確認だけで Bluetooth bond 消去成功を断定しない。
