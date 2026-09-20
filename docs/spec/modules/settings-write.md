# Settings write

## 範囲・根拠

- 種別: firmware custom settings の list、メモリ書込み、section Save / Discard / Reset と、表示する shared `CustomSettingsSectionCard` / `SettingRow` の共通契約。主 consumer は [Settings](../pages/settings.md) の `AdvancedSettingsSection` と [TrackballPage](../../../src/pages/TrackballPage.tsx)。
- 確認: 2026-09-20、コード確認のみ。実機の firmware value validation、flash 永続化、notification timing は未実測。
- 関連仕様: page 固有の power timeout は [Settings](../pages/settings.md)。接続・unlock availability は [device session](device-session.md)。

| 根拠 | ソース / symbol                                                                                                                                      | 確認内容                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| S1   | [useCustomSettings](../../../src/hooks/useCustomSettings.ts): `useCustomSettings`, `collectListSettings`, `writeSettingToMemory`, `mutateScope`      | list、identity、RAM write、section operation |
| S2   | [AdvancedSettingsSection](../../../src/components/AdvancedSettingsSection.tsx): `SettingRow`, `CustomSettingsSectionCard`, `AdvancedSettingsSection` | debounce、status、source、confirmation       |
| S3   | [debounce hook](../../../src/hooks/useDebouncedMemoryWrite.ts): `MEMORY_WRITE_DEBOUNCE_MS`, `useDebouncedMemoryWrite`                                | shared queued/saving/idle contract           |
| S4   | [chunked value](../../../src/lib/customSettingsChunkedValue.ts): `writeValueChunked`                                                                 | large scalar string/bytes path               |
| S5   | [TrackballPage](../../../src/pages/TrackballPage.tsx): `useCustomSettings`, `CustomSettingsSectionCard`                                              | scoped consumer                              |

## 機能要求

| ID        | できるべきこと                                                                                                    | 出典・確度     |
| --------- | ----------------------------------------------------------------------------------------------------------------- | -------------- |
| WRITE-R01 | firmware が公開した settings を subsystem、source、key、array index ごとに識別し、型に応じて編集できる            | S1/S2 から推定 |
| WRITE-R02 | 連続入力を debounce して RAM 更新と flash 保存を分離し、ユーザーが section 単位で Save / Discard / Reset を選べる | S1–S3 から推定 |
| WRITE-R03 | 書込み失敗時に楽観表示を device の再読込で補正し、確定していない値を保存済みと表示しない                          | S1/S2 から推定 |

## 前提・状態

- unavailable: `cormoran_custom_settings` が discovery にない、または scoped `subsystemIdentifier` が current custom-subsystem list にない場合、list は空または unavailable となる。呼出し page が案内を表示する。
- loading: list 中、Save / Discard / Reset 中は hook `isLoading`。card の action button は無効になる。Advanced Settings は初回 expand まで `autoLoad: false`。
- ready / empty: notifications で得た `Setting[]` を `customSubsystemIndex` ごとに section 化する。empty list は section を作らない。
- row status: `hasUnsavedValue` は緑（RAM only）、`defaultValue` がある persisted value は青（compile-time default と差）、それ以外は default。queued / saving 中は row status text を優先する。
- persistence: SettingRow は 1,500 ms quiet 後に MEMORY write。section Save は同 section の settings を firmware persistence に送る。section Discard は RAM edits を捨て、Reset は firmware defaults を要求する。実際の flash 成功は response / reload 以上に検証していない。

## 現行の機能仕様

| ID        | 前提 → 操作                                                 | 観測できる結果                                                                                                                                                         | 保存範囲・副作用                                                                                               | 根拠  |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| WRITE-001 | custom settings ready → `loadSettings`                      | list request に scope / `requireMeta` / `requireDefault` を付け、notification を最大 5 秒 request timeout と 750 ms quiet window で収集。identity 重複を除き sort する | 読込み。notification count / quiet timing で完全性を推定するため、firmware notification 欠損の完全検出はしない | S1    |
| WRITE-002 | row editor の値を連続変更                                   | row は最後の値だけを約 1,500 ms 後に `writeSettingToMemory`。`Queued` → `Saving…` → status dot                                                                         | デバイス RAM。edit 中だけでは section Save / flash を行わない                                                  | S2/S3 |
| WRITE-003 | scalar string / bytes が single-frame 上限を超える          | `writeValueChunked`、それ以外は `writeSetting` を MEMORY mode で送る                                                                                                   | デバイス RAM。array は chunked path を使わない                                                                 | S1/S4 |
| WRITE-004 | memory write 成功                                           | local setting value を更新し `hasUnsavedValue: true`。default hint は値が default と同じなら隠れる                                                                     | RAM edit。Save を押すまで persisted ではない                                                                   | S1/S2 |
| WRITE-005 | memory write 失敗                                           | hook error をセットし、`loadSettings` で firmware 値を再取得する                                                                                                       | 楽観的 local value を reload で補正。queued timer 自体の UI error は row ではなく consumer error に依存        | S1/S2 |
| WRITE-006 | section に unsaved item → `Save`                            | `saveSettings` scope（subsystem index、all source）後に reload。Save は unsaved がないと無効                                                                           | section の RAM edits を persistence へ送る                                                                     | S1/S2 |
| WRITE-007 | section → `Discard`                                         | `discardSettings` scope 後に reload                                                                                                                                    | section の RAM edits を捨てる。compile-time default への reset ではない                                        | S1/S2 |
| WRITE-008 | section → `Reset` → native confirm 承認                     | `Reset all settings in <identifier>?` 確認後 `resetSettings` scope と reload                                                                                           | section の firmware defaults を要求し local edits も捨てる。Cancel は RPC を送らない                           | S1/S2 |
| WRITE-009 | 同一 section に複数 source                                  | `Central` / `Peripheral N` selector で一 source の rows だけを表示。source 切替は write を送らない                                                                     | source は setting identity の一部。別 split side を同じ値と仮定しない                                          | S1/S2 |
| WRITE-010 | value が compile-time default と異なる → `Default: <value>` | hint click は default を RAM に queue するだけ                                                                                                                         | Save まで persistence しない                                                                                   | S2    |

## 代表ユーザーフロー

### F1: 一つの custom setting を保存する（WRITE-001–006）

1. Settings → `Advanced Settings` を展開し、section identifier、source、row の現値・status を記録する。
2. 一つの editable row を変更する。`Queued`、`Saving…`、緑の unsaved indication を順に確認する。
3. section `Save` を選び、reload 後に緑が消えることを確認する。青は default との差であり、失敗ではない。
4. 実機電源断後の保持は別検証として扱い、既知の default 以外へ残さない。

### F2: Discard と Reset の境界（WRITE-007/008/010）

1. row を変更して unsaved indication を出す。`Discard` を選び、読み直された値へ戻ることを確認する。
2. default hint がある row で hint を選ぶ。Save 前は memory write であることを確認する。
3. `Reset` を選び native confirmation を Cancel。RPC と表示値が変わらないことを確認する。
4. Reset の Confirm は destructive なので、実機では firmware default と影響する section を記録してから行う。

### F3: split source と連続入力（WRITE-002/009）

1. 2 source 以上の section で Central の一行を変更し、1.5 秒未満にさらに変更する。
2. 最後の値のみ write されることを確認し、source を切替えて Peripheral の同 key が意図せず変わらないことを確認する。
3. Save は section scope / all source の RPC なので、影響範囲を firmware docs と実機で確認するまで cross-side persistence を断定しない。

## 不変条件

- WRITE-I01: setting identity は custom subsystem index、key、source、array index の組であり、同名 key でも別 source / array element を上書きしない（S1/S2）。
- WRITE-I02: queued input の前の timer を cancel して、最後の値以外を送らない。unmount 時の未送信 timer は cancel する（S2/S3）。
- WRITE-I03: row edit と default hint は MEMORY write だけで、section Save 前に persisted / flash と表示しない（S1/S2）。
- WRITE-I04: Discard は factory default へ戻す操作ではなく、Reset は user confirmation なしに送らない（S1/S2）。
- WRITE-I05: write failure 後に楽観値を残して成功表示しない。reload 後の firmware report を再表示する（S1）。

## エラーと復帰

- list request は custom settings unavailable、empty response、firmware error、5 秒 timeout、notification decode error を取り得る。hook `error` に文字列を設定し、caller は表示可否を持つ。
- MEMORY write failure は error と `loadSettings`。section mutation failure は reload をせず false を返すため、再試行または明示 Reload が必要になり得る。
- Cancel された debounce timer は device request を送らない。in-flight write の cancellation / ordering、Save が queued write を flush することは保証しない。
- lock-required は `useCustomSubsystem` の gate 設定に従う。Unlock prompt / Cancel からの caller 表示は [device session](device-session.md) と consumer の責務である。

## 探索の観点

1. scalar / array、int / bool / string / bytes / behavior、single-frame 境界を変え、editor と chunking を確認する。
2. 1.5 秒以内の連続編集、source 切替、section collapse、tab 切替、disconnect 中に queued / saving state を確認する。
3. Save / Discard / Reset × success / firmware reject / unlock cancel × native confirm Cancel。
4. notification が 0、expected count と異なる、750 ms 超遅延、5 秒 timeout の list で stale / partial data を成功扱いしないか。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

firmware の Setting schema 制約、flash persistence、source scope がどの split side に保存されるか、chunk transfer 中断、Save と queued write の競合、Storage / unlock error の全 consumer presentation は未検証。`hasUnsavedValue` と `defaultValue` は firmware report に依存し、単独で物理的保存を証明しない。
