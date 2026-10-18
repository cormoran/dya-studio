# Settings

## 範囲・根拠

- 種別: core settings RPC の power management と、全設定 factory reset を扱うページ。入口は [App](../../../src/App.tsx) の `getTabs` の `settings`。
- 接続切替・非対応 gate の確認: 2026-10-14、issue #264 修正。その他の確認: 2026-09-20、`8627e4d`（追加レビュー `bcfa786`、app source 同一）、コード確認のみ。Advanced Settings の共有契約は [settings write](../modules/settings-write.md) に分離する。
- 関連仕様: 通常タブの接続条件は [app shell](../modules/app-shell.md)、接続開始・lock gate は [device session](../modules/device-session.md)。

| 根拠 | ソース / symbol                                                                                                | 確認内容                         |
| ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| S1   | [SettingsPage](../../../src/pages/SettingsPage.tsx): `SettingsPage`, `write`, `handleReload`, `handleResetAll` | timeout UI、factory reset dialog |
| S2   | [settings hook](../../../src/hooks/useSettings.ts): `useSettings`, `setActivitySettings`, `loadAllSettings`    | core RPC と central source       |
| S3   | [debounce hook](../../../src/hooks/useDebouncedMemoryWrite.ts): `useDebouncedMemoryWrite`                      | 1,500 ms queued/saving state     |
| S4   | [reset hook](../../../src/hooks/useResetSettings.ts): `useResetSettings`                                       | reset-all RPC 成否               |
| S5   | [AdvancedSettingsSection](../../../src/components/AdvancedSettingsSection.tsx): `AdvancedSettingsSection`      | advanced entryと lazy load       |

## 機能要求

| ID      | できるべきこと                                                                             | 出典・確度                                                    |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| SET-R01 | 現在の対応接続の中央側 idle / sleep timeout を選び、入力中・送信中・成功・失敗を区別できる | S1–S3 から推定                                                |
| SET-R02 | 全設定 reset の対象と取消不能性を明示し、確認後だけ実行できる                              | S1/S4 から推定                                                |
| SET-R03 | firmware が公開する追加設定を遅延読込し、セクション単位の保存境界を示す                    | S5 と [settings write](../modules/settings-write.md) から推定 |
| SET-R04 | Idle / Sleep timeout の識別、現在値、展開状態、キーボード操作を支援技術へ公開する          | issue #215                                                    |

## 前提・状態

- 未接続: `Waiting for device connection...`。ただし page header は存在する。通常の接続条件は共有 app shell に従う。
- unsupported: 接続中に `zmk__settings` がなければ module 導入案内だけを表示し、未接続の待機文言とは区別する。前接続の値・Power Management / Advanced Settings の editor・Reload / Versions は表示しない。一方 Danger Zone は接続中なら core protocol のため settings subsystem 非対応でも表示する。
- loading: 初回に `Loading settings...`、Reload 中は spinner。`getAllActivitySettings` の値は notification で収集する。
- ready: `sourceId === 0` の Central の timeout を編集でき、全 source の現在値を読み取り表示する。
- queued / saving / saved / error: timeout は 1,500 ms debounce 後の write-through。`Saving...`、成功後最大約 2 秒の `Saved`、hook error を表示する。これは Advanced custom setting の RAM → Save 契約とは異なる。

## 現行の機能仕様

ページタイトル直下の説明文と主操作の狭幅配置は[共通画面 SHELL-022](../modules/app-shell.md)に従う。幅640px未満では説明文を非表示にし、操作はタイトル行から配置して必要な分だけ折り返す。

ページ見出し左の装飾アイコンは[共通画面 SHELL-021](../modules/app-shell.md)に従い、幅640px未満では枠ごと非表示、640px以上では表示する。

Popでは「Current Settings by Device」の背景を淡い青（#e4f5ff）にし、値・表示条件・保存処理は維持する（SET-001、S1、2026-10-17ユーザー要求）。

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID      | 前提 → 操作                                                           | 観測できる結果                                                                                                                                                                                                                                                                                                                                       | 保存範囲・副作用                                                                                                                                                                                                             | 根拠  |
| ------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| SET-001 | settings RPC ready → page 初回表示 / `Reload`                         | `getAllActivitySettings` の notifications を約 500 ms 収集し、Central と peripheral の値を表示。Reload 後に version capture。接続・ready・subsystem index が変われば旧値、loading/error、editor 状態を無効化し、対応接続なら新しく読む                                                                                                               | 読込み。接続切替時は旧 notification subscription と収集 timer、未送信 debounce を取消。送信済み RPC のデバイス側取消は保証せず、遅れた応答・通知・成功/失敗を新接続へ反映しない。通常 Reload は queued write を flush しない | S1/S2 |
| SET-002 | `Idle Timeout` または `Sleep Timeout` を preset / custom 値へ変更     | disclosure button の accessible name は field identity と現在値を含み、`aria-expanded` / `aria-controls` は選択肢 group を指す。展開すると最初の preset に focus し、Enter で選択後は trigger に戻る。preset と custom の現在選択は `aria-pressed` で示し、custom form の Cancel 後は custom control に focus を戻す。custom 値は直ちに pending 表示 | Central の `setActivitySettings` RPC。0 は timeout 無効、値は 0..4294967295 の整数。既存の 1,500 ms debounce と write-through は不変                                                                                         | S1–S3 |
| SET-003 | timeout write 成功                                                    | settings を再読込し、約 2 秒 `Saved` を表示                                                                                                                                                                                                                                                                                                          | core settings RPC の write-through。Discard / per-timeout Reset はない                                                                                                                                                       | S1/S2 |
| SET-004 | timeout 値が範囲外または RPC が失敗                                   | page alert に error。pending は write 終了時に消える                                                                                                                                                                                                                                                                                                 | エラー後に自動 rollback を保証しない。Reload で実デバイス値を再確認する                                                                                                                                                      | S1/S2 |
| SET-005 | `Advanced Settings` を最初に展開                                      | custom settings を lazy-load。以後に閉じて再展開しても単に展開状態を替える                                                                                                                                                                                                                                                                           | custom setting の edit / Save / Discard / Reset は [settings write](../modules/settings-write.md)                                                                                                                            | S5    |
| SET-006 | Danger Zone または Versions の `Reset all settings` → dialog → Cancel | dialog が閉じ、reset RPC は送らない                                                                                                                                                                                                                                                                                                                  | 変更なし                                                                                                                                                                                                                     | S1    |
| SET-007 | reset dialog → `Reset all settings`                                   | busy 中は Cancel / close / confirm を無効化。成功時に dialog を閉じる                                                                                                                                                                                                                                                                                | keymap と custom settings を含む保存済み設定を firmware default へ戻す要求。不可逆、再起動・反映時期は未保証                                                                                                                 | S1/S4 |

## 代表ユーザーフロー

### F1: power timeout を変更して確認する（SET-001–004）

1. 接続済みで Central の Idle / Sleep 値と `Current Settings by Device` を記録する。
2. Idle の preset または `Custom value...` を変更し、直後の pending 表示、`Saving...`、`Saved` を順に確認する。
3. `Reload` を選び、Central の値を読み直す。実機電源断後まで維持されるかはこのフローでは合格にしない。
4. 元値を戻して同じ経路で保存する。

### F2: factory reset を取消する（SET-006）

1. `Reset all settings` を選び、keymap と custom settings を含み元に戻せない説明を読む。
2. `Cancel`、Escape、overlay close を busy でない状態で試し、dialog が閉じるだけで値が変わらないことを確認する。
3. 実機では Confirm を行わない。実施する場合は keymap を含む復旧方法を先に準備する。

### F3: advanced settings の入口を確認する（SET-005）

1. `Advanced Settings` を開く前に network/RPC log を記録できる環境なら custom-settings list request がないことを確認する。
2. 初回展開後に section と source を確認する。値の編集・Save / Discard / Reset は [settings write](../modules/settings-write.md) のフローに従う。

### F4: 接続ごとの可用性と値（SET-R01 / SET-001）

1. Demo Settings RPC ON で値を読み、Idle editor を開く。
2. Subsystems で Settings RPC OFF → `Reconnect to apply` → Settings。非対応案内だけになり、旧値・timeout editor・Advanced Settings・Reload が消え、Danger Zone の reset dialog は Cancel できる。
3. Settings RPC ON → reconnect。新しい読取りの値から editor を表示する。
4. 対応接続同士の切替、ready が false になる間の queued edit、旧通知 / read / write の遅延は hook/component test でも検証する。Demo の同一値だけから別の物理デバイスを読み直したと推定しない。

## 不変条件

- SET-I01: timeout の debounce は最後に queue した idle/sleep の組を一回だけ送る。表示だけを成功や flash 永続化と見なさない（S1–S3）。
- SET-I02: 編集フォームの基準値は `sourceId === 0` だが、peripheral 別の編集・隔離を保証しない。set RPC の `source: 0` は対象指定に使われないため、変更後は全 source の値を再取得して確認する（S1/S2）。
- SET-I03: factory reset は confirmation 前、または Cancel / dialog close だけでは送信しない。busy 中の close/cancel を受け付けない（S1）。
- SET-I04: Advanced custom settings のメモリ書込みと core activity settings の write-through を同じ Save / Discard 意味として扱わない（S1/S5）。
- SET-I05: 前 session の read / write / notification は新 session の値・error・loading・Saved を変えない。対応接続同士でも connection identity または subsystem index の変更で未送信編集を取消し、editor を閉じる（S1/S2）。
- SET-I06: timeout selector は Idle と Sleep の各 field identity と表示中の preset/custom 値を accessible name で示し、展開状態と制御対象 group を関連づける。現在値に対応する preset または custom control が一つだけ `aria-pressed=true` となり、custom control は numeric form を開いている間も表示する（issue #215、S1）。

## エラーと復帰

- settings RPC 非対応は導入案内、load / update failure は上部 alert。接続・unlock 問題の可能性を error だけから断定しない。
- `setActivitySettings` 失敗後、値が未送信か部分適用かは response だけでは保証しない。Reload で各 source の実値を読む。
- reset-all failure は Danger Zone 下に `resetError` を表示し、dialog は成功時だけ閉じる。失敗中・再起動中のデバイス状態は未検証。

## 探索の観点

1. preset、0、custom の最小/最大、整数でない入力、Idle と Sleep を 1.5 秒以内に連続変更する。
2. write 中に Reload、tab 往復、接続切断を行い、古い pending 値が成功表示にならないか。
3. settings RPC なしでも Danger Zone の説明と confirmation が表示されるか。
4. Advanced Settings を開閉し、初回だけの list load、複数 source の表示、shared write status を確認する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

factory reset の実機 reboot、flash 永続化、core response と notification の欠損時挙動、pending write と Reload の競合、WebMCP tool の実行結果は未検証。既存コードだけから peripheral timeout 変更や reset の原子性は保証できない。
