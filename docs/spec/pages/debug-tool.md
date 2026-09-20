# Debug Tool

## 範囲・根拠

- 種別: Devtool subsystem がある接続中に app shell から開く floating `Devtool` window。通常 tab/route ではない。診断 tab の stack panel は [Troubleshooting](troubleshooting.md) を参照する。
- 確認: 2026-09-20、`8627e4d`。コード確認のみ。window 操作、firmware logs、reboot/bootloader の UI 実測は未実施。

| 根拠 | ソースと symbol                                                                                                             | 根拠の内容                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| S1   | [App](../../../src/App.tsx): `AppContent`, `isDevtoolAvailable`, `devtoolOpen`                                              | 開く条件と close consumer                |
| S2   | [DevtoolWindow](../../../src/components/DevtoolWindow.tsx): `onDragStart`, `onResizeStart`, `toggleLock`, `runDeviceAction` | floating window/device controls          |
| S3   | 同ファイル: log streaming effect, notification subscription, `clearLogs`, `exportLogs`                                      | logging contract                         |
| S4   | [useDevtool](../../../src/hooks/useDevtool.ts): `DEVTOOL_SUBSYSTEM_IDENTIFIER`, `useDevtool`                                | availability/ready/passive unlock policy |

## 機能要求

| ID        | できるべきこと                                                                                      | 出典・確度        |
| --------- | --------------------------------------------------------------------------------------------------- | ----------------- |
| DEBUG-R01 | Devtool 対応 device のみで developer controls と log stream を独立 floating window として開閉できる | S1/S2/S4 から推定 |
| DEBUG-R02 | log の取得状況、filter、memory cap、drop を混同せず診断用 text を export/clear できる               | S3 から推定       |
| DEBUG-R03 | lock/reboot/bootloader の破壊的・接続影響操作で busy/error を見せる                                 | S2 から推定       |

## 前提・状態

- App shell は connection connected かつ `cormoran__devtool` subsystem available の時だけ Devtool toggle を表示する。subsystem が無ければ window 入口は無い。
- `useDevtool` は `unlockGate: false` の passive consumer。lock required は unlock dialog を出さず no-op/response error とし得る。
- window は portal で `document.body` に出す。初期位置は viewport right/bottom 寄り、初期 size 500×480、min 320×240。位置/size、filter、cap は browser persistent storage に保存しない。

## 現行の機能仕様

| ID        | 前提 → 操作                                 | 観測できる結果                                                                                                                      | 保存範囲・副作用                                                                                                                   | 根拠     |
| --------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| DEBUG-001 | app shell Devtool toggle → titlebar X/Close | floating window の mount/unmount。close で app `devtoolOpen` false                                                                  | mount 時 log streaming ON、unmount cleanup で OFF を best effort RPC                                                               | S1/S2/S3 |
| DEBUG-002 | titlebar drag / corner resize               | x/y は viewport 内に clamp、min size 320×240                                                                                        | UI memory only。resize 最大値 clamp はない                                                                                         | S2       |
| DEBUG-003 | Lock status refresh / Lock/Unlock/Toggle    | `Locked`/`Unlocked`/`—`、busy `...`、error text                                                                                     | Studio lock-state RPC。lock state は device-side state、flash persistence は未確認                                                 | S2/S4    |
| DEBUG-004 | `Reboot` / `Bootloader`                     | device action RPC を開始、busy 中 controls 無効。response/exception は red error                                                    | device restart/DFU transitionを要求する破壊的接続操作。成功後の reconnect を window は待たない                                     | S2       |
| DEBUG-005 | mount ready → log notifications             | log records を cap 内で oldest から捨てて末尾へ scroll。firmware `droppedCount` は yellow warning に累積                            | firmware log streaming ON/OFF。UI record cache は mount lifetime                                                                   | S3       |
| DEBUG-006 | level select / `filter source / message…`   | ALL/ERR/WRN/INF/DBG と source/message の client-side filter。text は 200 ms debounce                                                | filter は RPC/recordを変更しない。level は selected threshold 以上ではなく level number が filter level を超える record を除外する | S3       |
| DEBUG-007 | max 1k–50k を下げる                         | existing records も newest N に切詰め、`visible / total records`                                                                    | browser memory cacheのみ。firmware buffer capacityを変えない                                                                       | S3       |
| DEBUG-008 | Export / Clear                              | Export は current unfiltered cached records を timestamped `.txt` download。Clear は RPC 成功後 local records/drop/error を空にする | Export は download、Clear は firmware log clear RPC。filter は export 対象を限定しない                                             | S3       |

## 代表ユーザーフロー

### F1: opening and safe observation（DEBUG-001/002/005）

1. Devtool-enabled device を接続し、shell の Devtool toggle を押す。未対応 device では入口がないことを記録する。
2. window を drag/resize して最小幅/高さと viewport edge の挙動を確認する。
3. log が出る firmware action を実行せず通常 records を待ち、Close → log streaming OFF の best-effort 呼出はコード根拠、実機確認は未検証として記録する。

### F2: filtering, cap, export, clear（DEBUG-005/006/007/008）

1. records がある時に level/text filter を変え、visible/total count と `No records match the filter.` を比較する。
2. cap を小さくして newest records が残ることを確認する。firmware dropped warning と UI cap drop を同一視しない。
3. Export file の内容が filter 前の cached records であることを確認する。Clear は device log data を破棄するため、実機で押す前に別途承認を得る。

### F3: lock and device actions（DEBUG-003/004）

1. Refresh lock state、Lock/Unlock を試し、response error と state text を記録する。
2. Reboot/Bootloader は active connection を失い得る。通常探索ではクリックせず、実施時は reconnect と firmware mode を別途観測する。

## 不変条件

- DEBUG-I01: unavailable/disconnected device に Devtool toggle/window を出さない（S1/S4）。
- DEBUG-I02: unmount cleanup は ready 時だけ log stream disable を試み、失敗しても UI cleanupを阻害しない（S3）。
- DEBUG-I03: log cap 超過は newest records を残し、firmware dropped warning とは独立に扱う（S3）。
- DEBUG-I04: filter は display のみで Export/Clear の request/input records を書換えない（S3）。
- DEBUG-I05: drag は button target から開始して button click を奪わない（S2）。

## エラーと復帰

- lock/device action は `lockError ?? deviceError` の一行。各 action/Refresh を再試行できるが、reboot/bootloader の成功を UI response だけで接続復旧と判断しない。
- log streaming start/stop の mount cleanup error は無視され画面 alert にならない。notification decode error も無視される。
- Clear exception は `streamError` に残る。Clear が firmware に部分適用された可能性は Reload がないため、window reopen/firmware log発生で確認する。
- Export の browser download denial/Blob failure は UI error を持たない。

## 探索の観点

1. ready 変化中の open/close、connection loss/reconnect、subsystem unavailable。
2. 大量 log、firmware droppedCount、max cap の上下、200 ms filter 入力連打。
3. ERR/WRN/INF/DBG filter と source/message 大小文字検索、export との対象差。
4. lock RPC fail、device action fail/busy二重クリック、reboot/bootloader 後の shell状態。
5. viewport の小さい/大きい場合の drag clamp、resize、Close button。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- firmware log stream の start/stop 成功、record ordering、reboot/DFU後の再接続、lock persistence、download failure は未検証。
- no persistence の position/size/filter が製品要件として意図されたかは未確認。
