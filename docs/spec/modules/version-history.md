# Version history

## 範囲・根拠

各 tab の読込済み state から JSON snapshot を device/tab/schema ごとに保持し、version 選択→差分→confirm restore する共通機能を対象にする。各 page の通常 Save/Discard と key binding editing は[共通画面](app-shell.md)および[共通 binding editor](binding-editor.md)の責務である。コード確認: 2026-09-20、`8627e4d`（追加レビュー `bcfa786`、app source 同一）。UI 実測は未実施。

| 根拠 | ソース / symbol                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [useVersionHistory](../../../src/hooks/useVersionHistory.ts): `useVersionHistory`, `UNKNOWN_DEVICE_KEY`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S2   | [store/backend/types](../../../src/lib/versionHistory/versionStore.ts), [backend](../../../src/lib/versionHistory/backend.ts), [types](../../../src/lib/versionHistory/types.ts)                                                                                                                                                                                                                                                                                                                                                                                       |
| S3   | [diff](../../../src/lib/versionHistory/diff.ts): `stableStringify`, `diffSnapshots`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S4   | [restore hook/UI](../../../src/hooks/useTabVersionHistory.ts), [ResetVersionMenu](../../../src/components/versionHistory/ResetVersionMenu.tsx), [VersionDiffModal](../../../src/components/versionHistory/VersionDiffModal.tsx)                                                                                                                                                                                                                                                                                                                                        |
| S5   | [consumer adapters](../../../src/hooks/versionHistory/useKeymapVersionHistory.ts), [useMacroComboVersionHistory](../../../src/hooks/versionHistory/useMacroComboVersionHistory.ts), [useSettingsVersionHistory](../../../src/hooks/versionHistory/useSettingsVersionHistory.ts), [useTrackballVersionHistory](../../../src/hooks/versionHistory/useTrackballVersionHistory.ts), [useConnectionVersionHistory](../../../src/hooks/versionHistory/useConnectionVersionHistory.ts), [custom settings restore](../../../src/hooks/versionHistory/customSettingsRestore.ts) |
| S6   | [store tests](../../../src/lib/versionHistory/__tests__/versionStore.test.ts), [diff tests](../../../src/lib/versionHistory/__tests__/diff.test.ts)                                                                                                                                                                                                                                                                                                                                                                                                                    |

## 機能要求

| ID       | できるべきこと                                                                                           | 出典・確度        |
| -------- | -------------------------------------------------------------------------------------------------------- | ----------------- |
| HIST-R01 | 同一 keyboard・tab・現在対応 schema の、実読取済み状態だけを新しい順で参照できる                         | S1/S2 から推定    |
| HIST-R02 | 同一構造の再読取で履歴を増殖させず、違いを field 単位で確認してから復元できる                            | S1/S3/S4 から推定 |
| HIST-R03 | restore の keyboard persistence tier を tab ごとに正しく扱い、共通 RAM 説明を恒久保存 tab に誤適用しない | S4/S5 から推定    |

## 前提・状態

入口の表示名は consumer で異なる。Keymap / Macro&Combo は `Reset` メニュー内に履歴があり、独立した `Versions` ボタンを探しても見つからない。Settings / Connection / Trackball などは `Versions` 表示を使う（S4）。メニュー内の timestamp を選んだ時だけ diff modal に進む。

重要な判定上の限界: `collect()` の再呼出しは RPC による再読込と同義ではない。現行 consumer は主に hook の ref/state を集め、Macro は detail 取得も行う。画面の「Reading ... from the keyboard」という文言だけで最新実機値を保証しない。比較前に page の Refresh/Reload を行う。HIST-R01 は目標であり、notification collection の完全性や未送信の楽観 state の除外は未検証。

以下の persistent/write-through は consumer adapter のコメント上の契約と「別 Save を呼ばない」実装を表す。RPC 先の flash 保持をコードコメントだけで確認済みにしない（Connection / input-processing の未確認事項と同じ）。HIST-010–012 は実機電源断テストの pass ではない。

record identity は `deviceKey`（ConnectionContext の deviceName、欠ければ `unknown-device`）+ `tabId` である。record envelope は v1、payload は consumer ごとの schema version、timestamp epoch ms、plain JSON data。IndexedDB `dya-studio-version-history` v1 の `snapshots` store と `[deviceKey,tabId]` index を優先し、open 不可/非対応時は同じ semantics の page-process memory backend へ fallback する。memory backend は reload で失われる。

| 状態                         | 可用性 / 見分け方                                         | 保存・復帰                                                |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| disabled / not fully loaded  | consumer `enabled=false` または `collect() === null`      | list を空にし capture しない                              |
| loading/capturing            | read/capture/restore 中は menu busy icon                  | capture は同時一件に直列化                                |
| no versions / versions       | menu の `No versions saved yet` / timestamps newest first | schema/envelope 不一致 row は disk に残るが list から隠す |
| diff loading / empty / ready | fresh collect、`nothing to write`、field table            | version 選択だけでは write しない                         |
| apply error                  | modal 内 red error                                        | modal/selected version は残り、再試行または Cancel 可     |

## 現行の機能仕様

狭幅での履歴triggerは[共通画面 SHELL-010/011](app-shell.md)に従う。Reset/Versionsメニューはviewportの端から8px以上を確保し、利用可能な高さを超える内容はメニュー内で縦スクロールする。外側のpointer操作またはEscapeで閉じる。根拠: [ResetVersionMenu](../../../src/components/versionHistory/ResetVersionMenu.tsx) のRadix Popover。メニューを開く・閉じるだけでは復元/保存しない。

| ID       | 前提 → 操作                         | 観測できる結果                                                                                          | 保存範囲・副作用                                                                                  | 根拠     |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| HIST-001 | enabled tab mount / device change   | scope の current-schema rows を newest first で load                                                    | IndexedDB、不可なら process memory。scope 移動後の遅延 read は捨てる                              | S1/S2    |
| HIST-002 | `isLoaded` が false→true            | `collect` が null でなければ capture。一回の in-flight capture を守る                                   | tab が読んだ state のみ。編集中の state change 自体は capture trigger でない                      | S1       |
| HIST-003 | latest と structural equality       | object key order を正規化して同一なら record しない。異なれば timestamp record を append                | 同じ古い版への復帰は latest と異なるため新 record 可。最大30、古いものを delete                   | S2/S3/S6 |
| HIST-004 | `schemaVersion`/envelope 不一致 row | current version menu に出ない                                                                           | 物理 row は delete しない。payload shape を推測して restore しない                                | S2/S6    |
| HIST-005 | menu の saved timestamp を選ぶ      | fresh `collect` と selected snapshot の leaf diffを表示。arrays は index、空 container は leaf          | 選択/外側クリック/Escape は write しない                                                          | S3/S4    |
| HIST-006 | diff modal `Cancel` / dialog close  | selected/current/error を clear                                                                         | apply 中の close は拒否。keyboard/storage を変更しない                                            | S4       |
| HIST-007 | `Write to keyboard`                 | selected data を consumer `apply` で送る。成功時 modal を閉じる                                         | apply failure は error を表示し selected を残す。generic hook は persistence tier を保証しない    | S4       |
| HIST-008 | Keymap restore                      | layout index が違えば拒否。layer remove/restore/reorder/name/binding を差分だけ replay                  | keymap RAM。通常 Save が flash 永続化を担う                                                       | S5       |
| HIST-009 | Macro/Combo restore                 | macro name/steps/global、combo index/name/settings を差分 replay。作成後 list refresh を最大5秒待つ     | `persist:false` RPCで RAM。page Save が永続化                                                     | S5       |
| HIST-010 | Settings restore                    | idle/sleep timeout だけを central device 値と比較し `setActivitySettings`                               | RPC write-through の persistent storage。追加 Save は不要                                         | S5       |
| HIST-011 | Trackball restore                   | runtime processors と PMW3610 custom settings を一 confirm で差分適用。消えた processor/setting は skip | processor RPC は persistent write-through。custom settings は memory write で section Save が必要 | S5       |
| HIST-012 | Connection restore                  | profile name/output priority/endpoint・OS default layerを存在する対象だけ適用。pairing は復元しない     | BLE/default-layer RPC は persistent storage へ直書き。追加 Save は不要                            | S5       |

## 代表ユーザーフロー

1. enabled consumer tab の完全 read を完了し、menu の saved version timestamp を確認する。変更なしで再 read して count が増えないことを確認する（HIST-001–003）。
2. keyboard state を変え page の Refresh/Reload を完了してから過去 version を選ぶ。current/selected value table を確認し Cancel する（HIST-005/006）。collect の spinner は短く観測できない場合があり、最新実機値を読んだ証拠にはならない。
3. keymap/macro-combo を restore して通常 page の Save をまだ押さず、RAM edit と flash 保存を分けて確認する（HIST-008/009）。
4. settings/connection を restore して Save UI に依存しない persistent write-through を確認する（HIST-010/012）。trackball は processor と custom settings の異なる persistence tier を別々に確認する（HIST-011）。
5. IndexedDB を使えない profile で version feature が page editing を妨げず、reload 後 memory history が消えることを確認する（HIST-001）。

## 不変条件

- HIST-I01: 別 device または別 tab の record は現在 menu/restore の候補にならない（S1/S2/S6）。
- HIST-I02: object key order のみが異なる snapshot では新 version を作らないが、array order は差として扱う（S3/S6）。
- HIST-I03: schema/envelope 不一致 data を現在 schema として restore しない（S2）。
- HIST-I04: version 選択・Cancel・dialog close は keyboard write を行わない（S4）。
- HIST-I05: すべての restore を「RAMのみ」と表示・運用してはならない。Settings/Connection は persistent、Trackball は混在である（S5）。

## エラーと復帰

IndexedDB open/transaction/list/add error は console warning に留め、tab 本体を失敗させない。IDB 非対応/open failure は default memory backend へ fallback するが、既に選ばれた IndexedDB backend の transaction failureをその場で memory へ移し替える実装ではない。collect/apply error は modal error（または console warning）となり再試行/Cancellation が可能。restore は複数 RPC の逐次処理で transaction/rollback がなく、途中 failure は混合 state を残し得るため read/diff で復帰状態を確認する。

ここで modal error になるのは apply が例外を投げた場合。Settings の `setActivitySettings` は失敗時に `false` を返すが adapter は戻り値を検査しない。他 consumer も hook が error state に変換する場合があるため、modal が閉じただけでは restore 成功を証明できない。page alert と Refresh/Reload 後の差分を確認する（不具合候補、受け入れ根拠なし）。

## 探索の観点

- same/different device、unknown-device→名前判明、tab/schema change、30件境界、clock同値。
- IDB private mode/blocked upgrade/transaction error/reload の memory fallback。
- stale selection 中の device swap、rapid completed loads、arrays/order/empty values の diff。
- keymap layout mismatch、macro list refresh timeout、消えた processor/setting/profile、restore 中 disconnect。
- tab別 Save: Keymap/Macro/Trackball custom versus Settings/Connection persistent write-through を実機で分離する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

IDB migration beyond DB v1、device name collision/rename、multi-tab concurrent writes、actual flash persistence と各 RPC の firmware implementation は未検証。`useTabVersionHistory` の generic comment は RAM model を述べるが、consumer adapters は Settings/Connection persistent、Trackball mixed なので共通 UI 文言の「Save afterwards」はそれらの consumer では正確でない不具合候補であり、受け入れ根拠は確認できない。
