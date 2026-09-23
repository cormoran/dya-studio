# Macro&Combo

## 範囲・根拠

- 種別: `/macro-combo`（`Macro&Combo` タブ）の runtime macro / runtime combo 編集ページ。binding の選択・閉じ方は共通の [binding editor](../modules/binding-editor.md)、履歴の保存先・復元は [version history](../modules/version-history.md) を参照する。
- combo editor と RAM/flash の保存契約は [Keymap の combo card](keymap.md) からも利用する。各ページの Save/Discard はそれぞれのページが保持する hook 状態を操作するため、タブを戻した際は再読込で最新値を確認する。
- 入口と利用者: 接続後の `Macro&Combo` タブ。macro subsystem `cormoran__runtime_macro`、combo subsystem `cormoran__runtime_combo` の少なくとも一方が必要で、各 subsystem がない場合は個別の案内を表示する。
- 確認: 2026-09-20、`857b934` + 作業ツリー。コード確認と Demo（Orca iPhone 12、390×844）で MC-001 / MC-R03 の mobile 選択・配置・状態表示を実測。実機 flash 再起動後の結果は未実施。

| 根拠 | ソースと symbol                                                                                                                                                                                                                                        | 根拠の内容                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| S1   | [MacroComboPage](../../../src/pages/MacroComboPage.tsx): `handleSave`, `handleDiscard`, `handleResetToInitial`, JSX、[MobileMacroComboMenu](../../../src/components/macroCombo/MobileMacroComboMenu.tsx)                                               | 共通 toolbar、availability、選択の排他性、mobile 選択メニュー |
| S2   | [useRuntimeMacro](../../../src/hooks/useRuntimeMacro.ts): `loadMacros`, `runMutation`, `saveMacros`, `discardMacros`                                                                                                                                   | macro の RPC と RAM/保存済み境界                              |
| S3   | [useRuntimeCombo](../../../src/hooks/useRuntimeCombo.ts): `setCombo`, `deleteCombo`, `saveChanges`, `discardChanges`                                                                                                                                   | combo の RPC と pending 状態                                  |
| S4   | [useMacroEditor](../../../src/components/macroCombo/useMacroEditor.ts): `commitSteps`, `handleCreateMacro`, `handleDeleteMacro`, `handleResetMacro`                                                                                                    | macro detail と debounce                                      |
| S5   | [useComboEditor](../../../src/components/macroCombo/useComboEditor.ts): `applyDraftChange`, `handlePositionToggle`, `handleNewCombo`, `handleDeleteCombo`                                                                                              | combo draft、位置、保存前検証                                 |
| S6   | [MacroEditorCard](../../../src/components/macroCombo/MacroEditorCard.tsx)、[ComboEditorCard](../../../src/components/macroCombo/ComboEditorCard.tsx)、[GlobalSettingsCards](../../../src/components/macroCombo/GlobalSettingsCards.tsx)                | 観測可能な label と controls                                  |
| S7   | [macro editor tests](../../../src/components/macroCombo/__tests__/useMacroEditor.test.tsx)、[runtime macro tests](../../../src/hooks/__tests__/useRuntimeMacro.test.tsx)、[runtime combo tests](../../../src/hooks/__tests__/useRuntimeCombo.test.tsx) | hook の選択、失敗、保存境界の回帰根拠                         |

## 機能要求

| ID        | できるべきこと                                                                                                                | 出典・確度        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| MC-R01    | 利用可能な runtime macro と combo を、一方の選択が他方の編集対象を残さない形で編集できる                                      | S1/S4/S5 から推定 |
| MAC-R01   | macro の名前、step、global `Tap ms` を変更し、容量超過を保存前に判別できる                                                    | S2/S4/S6 から推定 |
| COMBO-R01 | combo の slot、二つ以上の物理位置、behavior、範囲/詳細設定を妥当な組合せだけ keyboard memory に適用できる                     | S3/S5/S6 から推定 |
| MC-R02    | RAM 上の変更と keyboard に保存済みの変更を区別し、Save/Discard/default reset を意図して選べる                                 | S1/S2/S3 から推定 |
| MC-R03    | モバイル幅では macro、combo、各 global settings、新規作成を上部の一つのメニューから選び、選択後すぐ下の編集 pane を確認できる | 明示要求          |

## 前提・状態

- 未接続では `Connect your keyboard to edit runtime macros and combos`。接続後でも subsystem ごとに unavailable になり、両方 unavailable なら編集リストを出さない。
- loading は各 hook の `isLoading`、combo と keymap を要する初回読込では `Loading combo data...`。ready は macro / combo list と detail、empty は `No macros yet. Create one above.` または空 combo slot の状態。
- locked は shared unlock gate を開く `Locked` button で、解除されるまで読み書き RPC の結果を保証しない。dirty は `Unsaved changes` と slot/global の StatusDot。`Save` は pending 変更があり、かつ macro encoded-size error がない時だけ有効になる。
- macro/combo の編集 RPC は keyboard memory への変更を表す。両 hook の `save...` / `discard...` が何を flash にするかはこのページの範囲であり、設定全般の保存経路は [settings write](../modules/settings-write.md) を参照する。

## 現行の機能仕様

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID        | 前提 → 操作                                                                                                 | 観測できる結果                                                                                                                                                                                                                      | 保存範囲・副作用                                                                                                                                            | 根拠                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MC-001    | desktop の macro/combo list、または mobile の選択メニューで item、設定、`Create macro` / `New combo` を選ぶ | 直後の編集 pane は macro、combo、各 Global Settings のいずれか一つ。別 domain の選択は解除される。mobile trigger は選択種別と項目名を二段表示し、menu は Macros / Combos / Settings に分かれ、項目の未保存・変更済み dot を維持する | 選択だけでは書込まない                                                                                                                                      | S1/S4/S5                                                                                                  |
| MAC-001   | macro の Name を変更                                                                                        | `Size` と step list を維持して名前を更新する。空白のみは元名へ戻す。約 1,500 ms の debounce 待機中と memory write 中は macro editor modal header に loading を表示する                                                              | debounce 後の成功 RPC は RAM の未保存変更にする。名前上限は device の `maxNameLength`。blur と Save は待機中の write を直ちに flush する                    | S2/S4/S6                                                                                                  |
| MAC-002   | `Step` で追加、Action を tap/down/up/delay/string に変更し、binding/数値を確定                              | row の Action と値が更新される。string は変換不能文字を error として表示する                                                                                                                                                        | step count と step を順に memory に書く。中間失敗の rollback はない                                                                                         | S2/S4                                                                                                     |
| MAC-003   | `Reset` を確認して承認 / `Delete`                                                                           | Reset は当該 slot の default を読込、Delete は detail 選択を消す                                                                                                                                                                    | 各 mutation は memory 上の未保存変更。Delete の確認 dialog は実装されていない                                                                               | S2/S4/S6                                                                                                  |
| MAC-004   | Macro Global Settings の `Tap ms` を入力し blur                                                             | green dot と `Shared macro pool: used/total B`（提供時）                                                                                                                                                                            | 短い debounce 後に memory へ書く。ページ toolbar `Save` まで flash 永続化しない                                                                             | S2/S4/S6                                                                                                  |
| COMBO-001 | `New combo` を選ぶ                                                                                          | 空いている slot を探す。既定 draft は name 空、position 空、enabled、global を継承する設定                                                                                                                                          | validation 通過後に `setCombo` と name を memory に書く。capacity を超える場合の作成拒否文言は hook の `No available combo slots.`                          | S3/S5                                                                                                     |
| COMBO-002 | keyboard preview の key を toggle                                                                           | `Positions` に昇順・重複なしで表示され、選択キーを highlight                                                                                                                                                                        | 2–16 positions、0–65535、valid behavior 前だけ debounce 後に memory write。単に preview を見る操作は書かない                                                | S5、[comboUtils](../../../src/components/macroCombo/comboUtils.ts): `normalizePositions`, `validateCombo` |
| COMBO-003 | Name/Enabled/behavior/layer/Advanced Options を変更                                                         | `All layers` または mask、timeout / idle / slow-release override を表示する                                                                                                                                                         | valid draft のみ memory に書く。per-combo timeout/idle の 0 は global 継承                                                                                  | S5/S6                                                                                                     |
| COMBO-004 | `Reset` / `Delete` を選ぶ                                                                                   | Reset は slot の default に戻し選択を再読込、Delete は list/draft を消す                                                                                                                                                            | pending 変更となり、toolbar Save まで flash 永続化しない。Delete は confirm を開かない                                                                      | S3/S5/S6                                                                                                  |
| MC-002    | dirty → `Save`                                                                                              | 保存成功なら macro/combo hook の pending を消し combo は `Saved N runtime combo changes.`                                                                                                                                           | 先に debounce を flush し、macro/combo の保存 RPC を順に呼ぶ。片方失敗時の原子的 rollback はない                                                            | S1/S2/S3                                                                                                  |
| MC-003    | dirty → Reset menu の Discard                                                                               | macro detail を保存済みに再読込し、combo selection を外して `Discarded N runtime combo changes.`                                                                                                                                    | queued write を cancel して keyboard に保存済みの値を memory に復元。browser/履歴を消さない                                                                 | S1/S2/S3                                                                                                  |
| MC-004    | Reset menu → `Reset every runtime macro and combo...` を confirm                                            | Cancel は変更なし。承認で全 list の各 slot を順に reset して Refresh                                                                                                                                                                | macro は `persist=false`、combo reset は hook が pending を立てる。reset-all 自体は Save を呼ばず、flash 永続化は保証しない。途中失敗時は部分変更が残り得る | S1/S2/S3                                                                                                  |

## 代表ユーザーフロー

### F1: macro の作成、容量境界、保存（MAC-001/002/004、MC-002）

1. 接続して `Macro&Combo` を開き、表示された subsystem と macro list の初期値を記録する。
2. `Create macro` → Name を入力し blur → `Step` → `delay` を選び値を確定する。`Size` と `Unsaved changes` を確認する。
3. `Size/maxMacroBytes` を超える step を作ろうとし、error が表示され `Save` が無効であることを確認する。実機の最大値は固定しない。
4. error を解消して `Save`。Saved 状態と Reload/Refresh 後の値を比較する。検証用に作った macro は Reset/Discard ではなく、意図を確認してから Delete する（Delete は確認なし）。

### F2: combo の位置、capacity、取消（COMBO-001/002/003/004、MC-003）

1. `New combo` を選び、empty slot がない場合の `No available combo slots.` を記録して終了する。
2. preview で二つの異なる物理 position を選び、`Positions` が昇順であることを確認する。1 position に戻すと validation error となり device write されないことを比較する。
3. binding editor で behavior を選び、layer と Advanced Options を変更する。binding editor の Apply/Close/Cancel 規則は共通仕様に従う。
4. `Discard` を選び、confirm がないこと、保存済みの combo list に復帰し selection が消えることを確認する。Cancel path は Reset menu に browser cancel control がないため該当なし。

### F3: global 保存と default reset の危険操作（MAC-004、MC-002/004）

1. Macro/Combo の gear を開き、`Tap ms` または `Timeout ms` を変更して StatusDot を確認する。
2. 直後の Save で debounce が含まれること、flash 保存後に dot が消えることを確認する。
3. `Reset every runtime macro and combo...` の native confirm を Cancel して値が不変であることを確認する。実機で承認する前に全 customizations が失われる文言を記録する。

## 不変条件

- MC-I01: macro と combo を同時に detail 選択しない。両 list を交互に選び、右 pane と選択表示を比較する（S1）。
- MAC-I01: encoded size error の macro を Save しない。error 直後の Save disabled を確認する（S1/S4）。
- COMBO-I01: position 1 個、17 個、無効 behavior、slot range 外の draft を `setCombo` へ送らない（S5 `validateCombo`）。
- MC-I02: Discard 前に queued macro/combo write を flush しない。変更直後に Discard し、保存済み値に戻ることを確認する（S1/S4/S5）。

## エラーと復帰

- macro/combo/keymap error、string conversion、macro size error は上部 alert。combo RPC error のみ `Dismiss` がある。Dismiss は成功/保存の証拠ではない（S1）。
- read/write RPC error は hook が `error` と loading を戻す。値は楽観更新済みである場合があり、Refresh で device の現値を取り直す。retry は Refresh、または同じ変更の再入力。
- locked/cancel unlock は shared gate の `device is locked` message になる。unlock 後は page effect が macro/combo の error を clear して reload する（S1）。
- Save/default reset の domain 横断処理に transaction/rollback はない。部分成功は未解決として Refresh → 状態記録 → 必要なら Discard で復帰する。

## 探索の観点

1. macro string の ASCII/shift 文字/変換不能文字、pool/encoded-size 上限、step count の増減。
2. combo の先頭/末尾 position、重複 toggle、2/16/17 positions、slot capacity、32 layer 境界。
3. debounce の直後に Save/Discard/Refresh/tab 往復して、古い write が復活しないか。
4. macro-only、combo-only、両 subsystem 不在、lock解除拒否、RPC failure で availability と error が混同されないか。
5. narrow layout と長い macro/combo name で preview と destructive control が操作可能か。
6. mobile の選択メニューが Refresh/Reset/Save と同じ高さ・同じ行に収まり、選択種別を小さな上段、項目名を下段に表示して長い名前を切り詰めるか。選択後に閉じて直下の編集 pane を表示するか。`Unsaved changes` の文字は隠れても status dot と各 menu item の dot が残るか。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- actual firmware slot capacity、flash 保存後の電源断耐性、遅延 RPC の競合は未検証。mobile の長い item 名と macro-only / combo-only 構成は UI 未実測。
- Delete の確認がない現行挙動はコードで確認したが、意図的な受容根拠は確認できない。
- default reset / save の部分成功に対する user-visible transaction 要件は不明。
