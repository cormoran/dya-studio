# Runtime macro / combo / tapdance editors

> 2026-10-18 ユーザー明示要求: Macro&Combo タブを廃止し、編集入口を [Keymap KM-029/030](keymap.md) のカードと modal に統合する。この文書は共有 editor/RPC の契約を定義する。旧ページの試行記録は当時の UI に対する証拠であり、現行のカード配置を実測した証拠ではない。

旧タブの互換実装と回帰比較用ソース: [MacroComboPage](../../../src/pages/MacroComboPage.tsx)。App のタブ登録からは除外する。

## 範囲・根拠

- 種別: `/keymap` の runtime macro / runtime combo / runtime tapdance カードと modal editor。binding の選択・閉じ方は共通の [binding editor](../modules/binding-editor.md)、履歴の保存先・復元は [version history](../modules/version-history.md) を参照する。
- combo editor と RAM/flash の保存契約は [Keymap の combo card](keymap.md) からも利用する。Save/Discard は Keymap ページ上部に統合する。
- この変更の確認: 2026-10-14、#262 の MAC-002 / MC-002 / MC-003 をコード・遅延/失敗 RPC 回帰テスト・Orca Demo（JA、1280×800）で確認。Demo は最初の Save → Refresh と同 macro 再選択 → 再編集後 Discard の値を比較。実機 flash / 電源断は未実施。共有 consumer の macro modal は同じ RAM debounce を使い、modal の終了/取消契約（BIND-019〜021）は変更しない。
- #213 の変更: 保存開始時の変更領域（macro の待機中/進行中 input write を含む）を記録し、利用可能という理由だけで成功通知の対象に含めない。成功通知と部分失敗の契約は MC-002、検証は page 回帰テストを参照する。
- 入口と利用者: 接続後の Keymap の Combos / Macros / Tapdances カード。macro subsystem `cormoran__runtime_macro`、combo subsystem `cormoran__runtime_combo`、tapdance subsystem `cormoran__runtime_tapdance` に応じて個別に編集と未対応案内を表示する。tapdance の独立した保存契約は TD-001〜006 を参照する。
- 確認: 2026-09-20、`857b934` + 作業ツリー。コード確認と Demo（Orca iPhone 12、390×844）で MC-001 / MC-R03 の mobile 選択・配置・状態表示を実測。実機 flash 再起動後の結果は未実施。

| 根拠 | ソースと symbol                                                                                                                                                                                                                                        | 根拠の内容                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| S1   | [KeymapPage](../../../src/pages/KeymapPage.tsx): handleSave/handleDiscard、[RuntimeListCard](../../../src/components/macroCombo/RuntimeListCard.tsx)                                                                                                   | カード・modal・共通保存               |
| S2   | [useRuntimeMacro](../../../src/hooks/useRuntimeMacro.ts): `loadMacros`, `runMutation`, `saveMacros`, `discardMacros`                                                                                                                                   | macro の RPC と RAM/保存済み境界      |
| S3   | [useRuntimeCombo](../../../src/hooks/useRuntimeCombo.ts): `setCombo`, `deleteCombo`, `saveChanges`, `discardChanges`                                                                                                                                   | combo の RPC と pending 状態          |
| S4   | [useMacroEditor](../../../src/components/macroCombo/useMacroEditor.ts): `commitSteps`, `handleCreateMacro`, `handleDeleteMacro`, `handleResetMacro`                                                                                                    | macro detail と debounce              |
| S5   | [useComboEditor](../../../src/components/macroCombo/useComboEditor.ts): `applyDraftChange`, `handlePositionToggle`, `handleNewCombo`, `handleDeleteCombo`                                                                                              | combo draft、位置、保存前検証         |
| S6   | [MacroEditorCard](../../../src/components/macroCombo/MacroEditorCard.tsx)、[ComboEditorCard](../../../src/components/macroCombo/ComboEditorCard.tsx)、[GlobalSettingsCards](../../../src/components/macroCombo/GlobalSettingsCards.tsx)                | 観測可能な label と controls          |
| S7   | [macro editor tests](../../../src/components/macroCombo/__tests__/useMacroEditor.test.tsx)、[runtime macro tests](../../../src/hooks/__tests__/useRuntimeMacro.test.tsx)、[runtime combo tests](../../../src/hooks/__tests__/useRuntimeCombo.test.tsx) | hook の選択、失敗、保存境界の回帰根拠 |

macro step と combo behavior の keycode 表示は [binding editor BIND-024](../modules/binding-editor.md) に従う。consumer brightness と keyboard F20/F21 を区別し、modifier と未知 page の数値を保持する。表示の解決だけでは RAM/flash に書き込まない。根拠は S4 の `getStepDisplayName` と [comboUtils](../../../src/components/macroCombo/comboUtils.ts) の `formatComboBehavior`。

## 機能要求

| ID        | できるべきこと                                                                                                      | 出典・確度                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| MC-R01    | 利用可能な runtime macro と combo を、一方の選択が他方の編集対象を残さない形で編集できる                            | S1/S4/S5 から推定                                                                                          |
| MAC-R01   | macro の名前、step、global `Tap ms` を変更し、容量超過を保存前に判別できる                                          | S2/S4/S6 から推定                                                                                          |
| COMBO-R01 | combo の slot、二つ以上の物理位置、behavior、範囲/詳細設定を妥当な組合せだけ keyboard memory に適用できる           | S3/S5/S6 から推定                                                                                          |
| MC-R02    | RAM 上の変更と keyboard に保存済みの変更を区別し、Save/Discard/default reset を意図して選べる                       | S1/S2/S3 から推定、[#262](https://github.com/cormoran/dya-studio/issues/262) の明示要求（文字列直後 Save） |
| MC-R04    | 共通 Save の成功通知は実際に変更された macro/combo 領域を明示し、失敗時に全体成功を示さない。macro 件数は推測しない | [#213](https://github.com/cormoran/dya-studio/issues/213) の明示要求                                       |
| MC-R03    | モバイル幅でも同じ Combos / Macros / Tapdances カードから一覧・作成・modal 編集・設定を操作できる                   | 2026-10-18 ユーザー明示要求、KM-029/030                                                                    |

## 前提・状態

- 未接続・初回 keymap loading は Keymap の gate に従う。未対応 subsystem も通常色のカードに `<title>: Not supported` と表示し、操作は出さない（KM-029）。対応しているが空の場合は空一覧を表示する。macro/tapdance 読込中は Loading、追加無効。旧API tapdance は更新案内を出して書込まない。
- locked は Keymap の Locked button と共有 unlock gate に従う。dirty はカードの緑色と StatusDot。Save の条件は KM-030。macro の blur RAM write が進行中でも Save は flush barrier を待つ。
- RPC エラーと容量/文字列変換エラーは対応カードの alert。tapdance editor には内部 alert も表示する。再試行はページ Reload または再編集。実機 flash / 電源断耐性は Demo から推測しない。

## 現行の機能仕様

ページタイトル直下の説明文と主操作の狭幅配置は[共通画面 SHELL-022](../modules/app-shell.md)に従う。幅640px未満では説明文を非表示にし、操作はタイトル行から配置して必要な分だけ折り返す。

ページ見出し左の装飾アイコンは[共通画面 SHELL-021](../modules/app-shell.md)に従い、幅640px未満では枠ごと非表示、640px以上では表示する。

MC-005: 旧タブ固有の Refresh/Save toolbar は廃止し、Keymap の Reload/Save に統合する。Reload は現在の RAM 値、Save は再起動後も維持する flash 保存を扱う。

全テーマでコンボ位置プレビューのキーを物理配置枠の各辺から2px内側に表示し、隣接キー間に4pxの隙間を設ける。物理座標・回転中心・位置番号・選択操作は維持する（COMBO-002、2026-10-17ユーザー要求）。

Popではコンボ位置プレビューの背景をアイスブルーにし、白い通常キーの形と押せる領域を識別できるようにする。選択キーはクリームイエロー背景・濃い文字・透明枠で表示し、強い黄色の内枠や点滅は表示しない。Keymap内の共有コンボエディタにも適用し、通常の入力ストリームのハイライトは変更しない（COMBO-002、ComboEditorCard / PhysicalKey、2026-10-17ユーザー要求）。

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID        | 前提 → 操作                                                                       | 観測できる結果                                                                                                                                                                                         | 保存範囲・副作用                                                                                                                                                        | 根拠                                                                                                      |
| --------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MC-001    | Keymap のカード item / gear / + を選ぶ                                            | item/gear は対象の編集/Global Settings modal を開く。macro/combo/tapdance + は RAM 作成後に modal を開く                                                                                               | 選択だけは書込まない。作成と終了は KM-029/030                                                                                                                           | S1/S4/S5                                                                                                  |
| MAC-001   | macro の Name を変更                                                              | `Size` と step list を維持して名前を更新する。空白のみや失敗した名前変更は入力欄に保持し、有効な RAM の名前は変えない。Keymap の editor は待機時間なしで直列に RAM 書込し、Save は完了を待つ（KM-031） | debounce 後の成功 RPC は RAM の未保存変更にする。名前上限は device の `maxNameLength`。blur と Save は待機中の write を直ちに flush する                                | S2/S4/S6                                                                                                  |
| MAC-002   | `Step` で追加、Action を tap/down/up/delay/string に変更し、binding/数値を確定    | row の Action と値が更新される。string は変換不能文字を error として表示する。文字列入力から直接最初の `Save` を押した場合も最新文字列を保存する                                                       | 追加・削除では先に待機中/進行中の string/delay write を完了し、その後 step を RAM に書く。中間失敗の rollback はない                                                    | S2/S4                                                                                                     |
| MAC-003   | `Reset` / `Delete`。detail 読込に失敗した場合も list から macro を選んで `Delete` | Keymap の macro Reset は廃止。header Delete は確認後、選択中の list entry と detail 選択を消す。detail が読めなくても選択名と Delete を表示する                                                        | 各 mutation は memory 上の未保存変更。Keymap の Delete は HTML 確認を開く（KM-031）                                                                                     | S2/S4/S6                                                                                                  |
| MAC-004   | Macro Global Settings の `Tap ms` を入力し blur                                   | green dot と `Shared macro pool: used/total B`（提供時）                                                                                                                                               | 有効入力を直ちに memory へ書く。header Save and close またはページ Save まで flash 永続化しない。終了確認と復元は KM-032                                                | S2/S4/S6                                                                                                  |
| COMBO-001 | `New combo` を選ぶ                                                                | 空いている slot を探す。既定 combo はローカライズ済み `Combo {{index}}` 名、positions `0, 1`、Key Press の `A`、enabled、global を継承する設定                                                         | `handleNewCombo` が既定の有効 combo と name を memory に書き、未保存の選択項目として表示する。capacity を超える場合の作成拒否文言は hook の `No available combo slots.` | S3/S5                                                                                                     |
| COMBO-002 | keyboard preview の key を toggle                                                 | `Positions` に昇順・重複なしで表示され、選択キーを highlight                                                                                                                                           | 2–16 positions、0–65535、valid behavior 前だけ debounce 後に memory write。単に preview を見る操作は書かない                                                            | S5、[comboUtils](../../../src/components/macroCombo/comboUtils.ts): `normalizePositions`, `validateCombo` |
| COMBO-003 | Name/Enabled/behavior/layer/Advanced Options を変更                               | `All layers` または mask、timeout / idle / slow-release override を表示する                                                                                                                            | valid draft のみ memory に書く。per-combo timeout/idle の 0 は global 継承                                                                                              | S5/S6                                                                                                     |
| COMBO-004 | `Reset` / `Delete` を選ぶ                                                         | combo Reset は slot の default に戻し選択を再読込、Delete は header 確認後に list/draft を消す（KM-031）。macro item の Reset は廃止し header Delete に統合                                            | pending 変更となり、toolbar Save まで flash 永続化しない。Keymap の Delete は HTML 確認を開く（KM-031）                                                                 | S3/S5/S6                                                                                                  |
| MC-002    | dirty → Keymap header Save                                                        | macro の待機中/進行中 RAM write を flush して変更領域を保存。成功後 dirty が消え Save 無効。macro/combo/tapdance の保存結果を変更領域ごとに表示する                                                    | RAM write/保存失敗は成功扱い をしない。途中成功の rollback はない。keymap を含む保存境界・無効条件は KM-030                                                             | S1/S2/S3                                                                                                  |
| MC-003    | dirty → Keymap Reset menu の Discard                                              | native confirm の Cancel は変更なし、承認後は保存済み値へ戻し modal を閉じる                                                                                                                           | queued write を cancel。未保存新規 tapdance は解放。browser/履歴を消さない                                                                                              | S1/S2/S3、KM-030                                                                                          |
| MC-004    | 旧 Macro&Combo の全 macro/combo default reset                                     | 旧タブ廃止により旧一括入口は廃止。macro item の Reset も廃止。combo の Reset to Default または Keymap default reset は従来の範囲で残す                                                                 | tapdance は default reset に含まない。各 Reset と flash 保存は呼出側仕様に従う                                                                                          | S1/S2/S3、KM-030                                                                                          |

## 代表ユーザーフロー

### F1: macro の作成、容量境界、保存（MAC-001/002/004、MC-002）

1. 接続して `Keymap` を開き、表示された subsystem と macro list の初期値を記録する。
2. Macros カードの `New macro` で RAM 作成と modal 表示を確認し、Name → `Step` → `delay` を選ぶ。Create macro ボタンは表示しない。`Size` と `Unsaved changes` を確認する。
3. `Size/maxMacroBytes` を超える step を作ろうとし、error が表示され `Save` が無効であることを確認する。実機の最大値は固定しない。
4. error を解消し、string step に `immediate` を入力して別操作や待機を挟まず入力欄から最初の `Save` をクリック。未保存表示が消え、Reload → 同 macro の再選択で文字列と新規 macro が保持されることを確認する。再編集後 Discard でも保存済み文字列へ戻ることを確認する。検証用に作った macro は Reset/Discard ではなく、意図を確認してから Delete する（header の確認あり）。

### F2: combo の位置、capacity、取消（COMBO-001/002/003/004、MC-003）

1. `New combo` を選び、empty slot がない場合の `No available combo slots.` を記録して終了する。
2. preview で二つの異なる物理 position を選び、`Positions` が昇順であることを確認する。1 position に戻すと validation error となり device write されないことを比較する。
3. binding editor で behavior を選び、layer と Advanced Options を変更する。binding editor の Apply/Close/Cancel 規則は共通仕様に従う。
4. modal を閉じ、Keymap Reset menu の `Discard` を選ぶ。confirm の Cancel では不変、承認で保存済み combo list に復帰することを確認する。

### F3: global 保存と default reset の危険操作（MAC-004、MC-002/004）

1. Macro/Combo の gear を開き、`Tap ms` または `Timeout ms` を変更して StatusDot を確認する。
2. 直後の Save で debounce が含まれること、flash 保存後に dot が消えることを確認する。
3. default reset の各入口は MC-004 と Keymap 仕様に従う。全 domain 一括 reset の旧入口を探さない。

### F4: 共通 Save の通知（MC-R04、MC-002）

1. 両 subsystem が利用可能な状態で、既存 macro の初期値を記録する。macro のみ変更 → Save → `Saved runtime macro changes.` を確認し、Reload → 同 macro 再選択で実際の値を読む。元値へ復帰 → Save → Refresh → 再選択でも元値を確認する。
2. combo のみ変更した場合は `Saved N runtime combo changes.`、両方変更した場合は `Saved runtime macros and N runtime combo changes.` を確認する。未変更の利用可能 domain を通知に含めず、各値を Refresh/再選択してから元へ戻して保存・再読込する。
3. 遅延/失敗 RPC は回帰テストで確認する。前回成功後の次の Save は flush 待機中から前回通知を消す。macro 保存成功後 combo 保存が失敗しても全体成功・履歴 capture はなく、先に保存した macro の rollback はしない。Demo で失敗を注入しなければその条件を UI pass としない。

## 不変条件

- MC-I01: 各カードのクリックは対象項目の modal を開き、別 item の内容を誤表示しない（S1、KM-029）。
- MAC-I01: encoded size error の macro を Save しない。error 直後の Save disabled を確認する（S1/S4）。
- COMBO-I01: position 1 個、17 個、無効 behavior、slot range 外の draft を `setCombo` へ送らない（S5 `validateCombo`）。
- MC-I02: Discard 前に queued macro/combo write を flush しない。変更直後に Discard し、保存済み値に戻ることを確認する（S1/S4/S5）。

## エラーと復帰

- macro/tapdance/combo のエラーは対応カード alert、keymap のエラーは Keymap 上部 alert。エラー表示の消失だけを成功/保存の証拠にしない（S1）。
- macro input の RAM write 失敗後は Save を再クリックしても古い RAM 値を保存しない。同じ入力を再編集して write が成功するか、Discard で保存済み値へ戻してから再試行する。入力 write / 保存 RPC 失敗時は error を表示し、失敗した入力を保存済みとして扱わず、全体成功通知を出さない（MC-002）。
- read/write RPC error は hook が `error` と loading を戻す。値は楽観更新済みである場合があり、Refresh で device の現値を取り直す。retry は Refresh、または同じ変更の再入力。macro detail の読込失敗後も list entry があれば選択名と Delete は残り、削除 RPC を試せる。
- locked/cancel unlock は shared gate の `device is locked` message になる。unlock 後は page effect が macro/combo の error を clear して reload する（S1）。
- Save/default reset の domain 横断処理に transaction/rollback はない。Save は新しい試行開始時に古い成功通知を消し、部分失敗では全体成功を表示せず全体成功通知も出さない。既存の hook error を表示し、Refresh → 状態記録 → 必要なら Discard または再編集/Save で復帰する。先に成功した domain の保存は残る。

## 探索の観点

1. macro string の ASCII/shift 文字/変換不能文字、pool/encoded-size 上限、step count の増減。
2. combo の先頭/末尾 position、重複 toggle、2/16/17 positions、slot capacity、32 layer 境界。
3. debounce の直後に Save/Discard/Reload/modal 往復して、古い write が復活しないか。
4. macro-only、combo-only、両 subsystem 不在、lock解除拒否、RPC failure で availability と error が混同されないか。
5. narrow layout と長い macro/combo name で preview と destructive control が操作可能か。
6. mobile のカード項目が折り返し、長い名前を省略して modal 内の名前欄と追加・編集・Close を操作できるか。header の共通操作とカードの StatusDot が残るか。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- actual firmware slot capacity、flash 保存後の電源断耐性、遅延 RPC の競合は未検証。mobile の長い item 名と macro-only / combo-only 構成は UI 未実測。
- non-split DYA2 Renode の空 macro を `Create macro` → `Save` すると、list entry は残る一方、再選択の `GetMacro` は `No macro bound to that slot`、`Delete` は `No macro with that name` になる事例を [CI #36151779631](https://github.com/cormoran/dya-studio/actions/runs/36151779631) で 2 回観測した。empty body の flash 保存・Renode NVS・firmware keyspace のどの層が原因かは未確定。UI の Delete 再試行で解消したとは扱わない。
- 既定の 0 ms delay を追加した macro でも [scheduled CI #38430933223](https://github.com/cormoran/dya-studio/actions/runs/38430933223) と [PR CI #38438539495](https://github.com/cormoran/dya-studio/actions/runs/38438539495) の削除 assertion が各 2 試行で失敗し、[#274](https://github.com/cormoran/dya-studio/issues/274) に記録されている。通常の非空 round-trip 用 [Renode fixture](../../../e2e/renode/tests/dya2/macro-combo.spec.ts) は UI から 25 ms を設定し、Save 前の再選択と Save 後の Refresh → 再選択で値を読み、削除保存後にも Refresh して初期件数へ戻ることを確認する（MAC-002/003、MC-002）。これは CI fixture の修正であり、product/firmware の変更ではない。空/0 ms 条件の原因・解消と実機の電源断後の永続性は未検証のまま残す。
- Keymap item の Delete は KM-031 の HTML 確認へ更新した。旧 MacroComboPage の挙動は現行入口の仕様としない。
- default reset の部分成功通知や原子的 rollback の要件は不明。Save の部分失敗は MC-002 に従い、全体成功を表示しない。

- 2026-10-15、`b3f0ea5` の Demo / Orca と Chrome で、作成済み combo の positions `0, 1` を `0` にすると validation error は出るが toolbar Save は有効だった。Chrome の Save は成功表示になり、list / Refresh は以前の有効値 `0, 1` を保持し、editor は無効 draft `0` を残した。無効値が書き込まれたとは観測していないが、表示中の draft と保存された RAM 値を区別できない問題として [#260](https://github.com/cormoran/dya-studio/issues/260) / [修正 PR #275](https://github.com/cormoran/dya-studio/pull/275) に対応する。PR は確認時に未 merge で、修正 branch の browser 検証は未実行。復帰は検証用 combo を Delete → Save → Refresh し、元の list と Save 無効を確認した。受け入れ済み不具合としては扱わない。

## Runtime tapdance

明示要求（2026-10-18 更新）: Keymap の Combos / Macros / Tapdances の順にカードを並べ、選択した tapdance を modal で編集する。空の固定 slot 一覧ではなく、必要時に shared pool へ確保する名前付き entry とする。根拠は [firmware PR #1](https://github.com/cormoran/zmk-feature-runtime-tapdance/pull/1) の API v2（proto 契約 `8c5d79b4553ca4762019effeb34cc764989371fc`）、[TapDanceEditorCard](../../../src/components/macroCombo/TapDanceEditorCard.tsx)、[TapDanceEditor](../../../src/components/macroCombo/TapDanceEditor.tsx)、[useRuntimeTapDance](../../../src/hooks/useRuntimeTapDance.ts)、[protobuf](../../../proto/cormoran/runtime_tapdance/runtime_tapdance.proto)。runtime macro/combo の履歴 UI は廃止。Keymap default reset は tapdance を含まない。

| ID     | 契約                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-001 | 接続中、Keymap の Combos / Macros に続けて Tapdances 一覧カードを表示する。一覧 item は回数ごとの割当をコンパクトに表示し（KM-033）、選択後は modal に選択 entry の名前と３アクションを表示する。空 entry 枠は列挙せず、firmware の List が返した名前付き entry を並べる。mobile でも同じカード順を維持する。New tapdance と Global Settings の操作を一覧の上部に置く。                                                                                                                                                                                                                                                                                                   |
| TD-002 | subsystem `cormoran__runtime_tapdance` がなければ unavailable。GetGlobal の api_version=2 を確認してから List をページ単位で読み、各 ID の Get を取得する。旧 Get/Set-only firmware には更新案内を出し、作成や書込みはしない。ID は配列位置ではなく安定した uint32 であり、一覧が空でも global interval と容量を取得できる。読込・書込中は二重 mutation を防ぐ。読込失敗はページ alert に残し、Refresh で再試行する。                                                                                                                                                                                                                                                     |
| TD-003 | modal の Single / Double / Triple は標準 binding selector を開く。runtime tapdance 自身は候補から除外する。Single は必須、Triple には Double が必要。Single 選択を促す説明文は表示しない。選択・Clear 後に有効な構成を RAM に適用する（Set は１ binding/１ RPC、persist=false）。削除は Triple から、追加は Single からの順序で中間構成も有効にする。無効/未適用の選択中 draft またはその書込 error は共通 Save を無効にし、他 domain 選択を不必要にブロックしない。失敗 draft は残り、binding の再選択またはページ Reload で再試行できる。Keymap item modal の本文に Apply to memory / Discard edits を表示せず、header Discard が対象だけを保存済み値へ戻す（KM-031）。 |
| TD-004 | ページの New tapdance は重複しない初期名で Create(name,persist=false) を送り、firmware が発行した ID を選択する。３ action が空でも作成済み entry として一覧に残る。Keymap の名前入力は有効な値を即時 RAM に適用する。Rename ボタンは表示しない。空/重複/firmware の UTF-8 byte 上限を超える名前では送らない（max_name_length は終端 NULL を含まず、既定 24 bytes まで）。Create は実 shared pool を確保し、Discard は未保存の新規 entry を解放する。削除済み ID は再利用せず、作成時の ID high-water mark は firmware が flash に保存するため、設定の Discard でも ID 発行を巻き戻さない。失敗時は一部が適用済みの可能性を alert に表示し、Refresh で状態確認する。      |
| TD-005 | 共通 Save は変更のある tapdance の Save RPC を実行し、成功後に再読込して dirty を消す。Discard は保存済みの値へ戻し、未保存新規を解放して選択を解除する。成功を得られない領域があれば全体成功通知 を行わない。tapdance の編集内容そのものは version history には含めない。Global Settings の interval は整数1〜2000で即時 RAM に反映し、header Save and close またはページ Save で永続化する（KM-032）。pool 使用/総 bytes と現在/最大 entry 件数を firmware の返答で表示する。最大 entry 件数は容量制限であり、事前割当済みの空枠ではない。pool 枯渇は firmware error とし既存 entry を維持、解放後の再作成を許す。                                                      |
| TD-006 | 全 layer の同じ ID を使用する runtime tapdance binding を数えて共有注意書きを表示する。ページでは全参照件数、キー選択では現在割当を除く他の参照件数。表示件数が0件のときは共有注意書きを表示しない。keymap 全体が未取得なら件数不明としゼロと断定しない。保持されたページへの復帰では keymap と tapdance を再取得する。macro 等に内包された参照は件数に含まない。名前変更で ID とキー参照を変えない。                                                                                                                                                                                                                                                                     |
| TD-007 | Delete tapdance は、同 ID を参照するキーが動作しなくなり Discard で復元できないことを native confirm で確認してから Delete RPC を送る。これは保存済み entry も即時削除し pool を解放する。取消では送らず、失敗では alert と entry を残す。keymap binding 自体は削除せず、他 entry の ID を詰め直さない。                                                                                                                                                                                                                                                                                                                                                                  |

キー選択内の editor は [BIND-027](../modules/binding-editor.md#runtime-tapdance-binding) を参照。そちらは選択前のローカル draft と Save の契約を持つ。

代表フロー: TD-001/003/005: 一覧の名前を選択 → Single の初期値を記録 → 変更して RAM 反映を待つ → 共通 Save → Refresh → 同名 entry の値を照合 → 元値を保存・再読込で復帰。TD-004/005/007: New tapdance → 名前変更 → Save → Refresh → ID が変わらないことを確認 → Delete の取消/承認 → pool 減少と Discard で再出現しないことを確認。未保存新規は Discard で件数と pool が戻り、再作成では削除済 ID を再利用しない。TD-006: 同 ID を複数キー/複数 layer で参照し、件数・共有更新・タブ復帰後の件数を比較する。

検証境界: codec を通した Demo simulator と hook の回帰テストは、実 firmware の tap 検出・allocator の正確な bytes・flash・電源断後の永続性を証明しない。Demo の bytes は模擬値で、同一接続内の再読込と解放の増減を検証する。実機、firmware-backed 検証、全テーマ UI の範囲は PR に記録する。
