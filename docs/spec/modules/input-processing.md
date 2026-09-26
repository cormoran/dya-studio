# Runtime input processing

## 範囲・根拠

- 種別: shared processor editor / custom-RPC contract。consumer は [Trackball](../pages/trackball.md) であり、keymap binding editor の契約は [binding editor](binding-editor.md) を参照する。
- 確認: 2026-09-20、`8627e4d`。コード確認のみ。`cormoran_rip` subsystem と processor notification を対象にし、UI 実測はしていない。

| 根拠 | ソースと symbol                                                                                                                                           | 根拠の内容                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| S1   | [useRuntimeInputProcessor](../../../src/hooks/useRuntimeInputProcessor.ts): `useRuntimeInputProcessor`, `loadProcessors`, `updateProcessorOptimistically` | subsystem、通知、read の契約 |
| S2   | 同ファイル: `setScaling`, `setRotation`, `setTempLayer*`, `setActiveLayers`, `setAxisSnap*`, `setXInvert`, `setYInvert`, `setXy*`                         | processor mutation contract  |
| S3   | [input processor tests](../../../src/hooks/__tests__/useRuntimeInputProcessor.test.tsx)                                                                   | RPC/通知の回帰根拠           |

## 機能要求

| ID        | できるべきこと                                                                   | 出典・確度     |
| --------- | -------------------------------------------------------------------------------- | -------------- |
| INPUT-R01 | firmware が報告する processor と layer を読み、processor ID を保った更新を送れる | S1/S2 から推定 |
| INPUT-R02 | processor ごとの tuning を別 processor に誤適用せず、通知の最新値を表示できる    | S1/S3 から推定 |

## 前提・状態

- `isAvailable` は custom subsystem の有無、`ready` は接続/RPC 準備を示す。未接続/unsupported は processors/layers を空にし、UI consumer が unavailable 表示を担当する。
- `loadProcessors` は list response だけでなく最大 500 ms の custom notification collection で processors を受け取る。loading は read/mutation 中共通、error は hook の文字列。
- ready で mount すると processor と layer を自動読込する。notification は既存 ID を置換、未知 ID を append する。

## 現行の機能仕様

| ID        | 前提 → 操作                                                                    | 観測できる結果                                                    | 保存範囲・副作用                                                                                                   | 根拠 |
| --------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---- |
| INPUT-001 | ready → `loadProcessors`                                                       | list request 後の notification processor list                     | read は保存しない。response error/exception は error                                                               | S1   |
| INPUT-002 | scaling を numerator/divisor で設定                                            | fraction を約分し multiplier → divisor の順で送る                 | first write 成功後、second write 失敗なら楽観 state は両値のまま残り得る。保存媒体は firmware RPC の外では確認不能 | S2   |
| INPUT-003 | rotation/temp layer/active layer/axis snap/invert/scroll/swap を ID 指定で更新 | 対象 processor の表示を先に更新し、response error を error にする | 各 request は write-through RPC。flash/RAM の区別は protocol 実装外で未確認                                        | S2   |
| INPUT-004 | custom processor notification を受信                                           | 同 ID の processor を notification 値に置換                       | caller の pending UI と競合する場合の優先規則は hook 単独にない                                                    | S1   |

### #28 拡張プロトコル

| ID        | 前提 → 操作                                  | 観測できる結果                                                                                                                     | 保存範囲・副作用                                                                         | 根拠  |
| --------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| INPUT-005 | processor notificationで慣性設定を受信       | 測定期間と出力間隔が正のprocessorだけ慣性対応として扱う。protobufの省略値を旧firmwareで有効な既定設定と誤認しない                  | discovery/readに新RPCを追加しない。既存タグ1–19は維持                                    | S1    |
| INPUT-006 | `setInertia`を呼ぶ                           | ID、整数範囲、対応を確認し#28の設定タグ23–26/30–33を送る。成功後に対象設定のみ更新。応答なし/firmware error/例外はerrorとreject    | PERSIST mode 0でflash保存を要求。実機電源断の検証とは別。consumerはdebounce/エラーを担当 | S1/S2 |
| INPUT-007 | `setInertiaNotifications` / 状態notification | request29で通知ON/OFF。notification2でactive/stop reason、3でFast inputを対象IDだけ更新。停止でFast表示を解除。失敗はerrorとreject | セッションの診断通知。設定の履歴captureから除外                                          | S1    |
| INPUT-008 | 接続/notification購読対象が変わる            | processor listと新機能対応情報を破棄し、新しい通知から読込み直す                                                                   | 古いdeviceの対応を次deviceへ持ち越さない                                                 | S1    |

根拠: [protocol](../../../proto/zmk/runtime_input_processor/runtime_input_processor.proto)、[upstream PR #28](https://github.com/cormoran/zmk-module-runtime-input-processor/pull/28) commit `7fa97aca3fefe4212c51a53c84f7caf889476086`。既存のRPC/write-through挙動は変更しない。

## 代表ユーザーフロー

1. Trackball を開き processor list が届くまで待つ（INPUT-001）。0 件の場合は firmware support と notification 到達を分けて記録する。
2. 一つの processor の rotation を変更し、同 ID の表示だけが更新することを確認する（INPUT-003）。
3. Refresh の直後に firmware notification を発生させられる環境では、最新 notification が processor row に反映されることを確認する（INPUT-004）。通常 Demo では未実施。

## 不変条件

- INPUT-I01: mutation は request ID と同じ processor だけを楽観更新する（S1 `updateProcessorOptimistically`）。
- INPUT-I02: scale divisor 0 を約分で除算しない（S1 `simplifyFraction`）。
- INPUT-I03: response error を成功扱いして pending/error を消さない（S2）。

## エラーと復帰

- ready でない `loadProcessors` は `Not connected to device or subsystem not found`。mutation は ready でない場合 no-op で、利用者への明示 feedback は caller 側にない。
- response/transport exception は `Failed to set ...` と error。optimistic mutation に rollback はないため Reload で firmware notification/current value を再取得して確認する。
- notification decode error は console に記録するのみで、画面 error にしない。

## 探索の観点

1. 二つの processor を交互に編集し、ID と表示の取り違えを調べる。
2. multiplier 成功/divisor 失敗、notification の順序逆転、response error を実機/テスト double で注入する。
3. 未接続、subsystem 無し、空 notification、500 ms より遅い notification を区別する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- 各 set request の firmware RAM/flash 永続化、通知欠落時の read 完全性、optimistic failure rollback の製品要件は未確認。
