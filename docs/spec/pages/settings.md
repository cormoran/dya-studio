# Settings

## 範囲・根拠

- 種別: core settings RPC の power management と、全設定 factory reset を扱うページ。入口は [App](../../../src/App.tsx) の `getTabs` の `settings`。
- 確認: 2026-09-20、`8627e4d`（追加レビュー `bcfa786`、app source 同一）、コード確認のみ。Advanced Settings の共有契約は [settings write](../modules/settings-write.md) に分離する。
- 関連仕様: 通常タブの接続条件は [app shell](../modules/app-shell.md)、接続開始・lock gate は [device session](../modules/device-session.md)。

| 根拠 | ソース / symbol                                                                                                | 確認内容                         |
| ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| S1   | [SettingsPage](../../../src/pages/SettingsPage.tsx): `SettingsPage`, `write`, `handleReload`, `handleResetAll` | timeout UI、factory reset dialog |
| S2   | [settings hook](../../../src/hooks/useSettings.ts): `useSettings`, `setActivitySettings`, `loadAllSettings`    | core RPC と central source       |
| S3   | [debounce hook](../../../src/hooks/useDebouncedMemoryWrite.ts): `useDebouncedMemoryWrite`                      | 1,500 ms queued/saving state     |
| S4   | [reset hook](../../../src/hooks/useResetSettings.ts): `useResetSettings`                                       | reset-all RPC 成否               |
| S5   | [AdvancedSettingsSection](../../../src/components/AdvancedSettingsSection.tsx): `AdvancedSettingsSection`      | advanced entryと lazy load       |

## 機能要求

| ID      | できるべきこと                                                               | 出典・確度                                                    |
| ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| SET-R01 | 中央側の idle / sleep timeout を選び、入力中・送信中・成功・失敗を区別できる | S1–S3 から推定                                                |
| SET-R02 | 全設定 reset の対象と取消不能性を明示し、確認後だけ実行できる                | S1/S4 から推定                                                |
| SET-R03 | firmware が公開する追加設定を遅延読込し、セクション単位の保存境界を示す      | S5 と [settings write](../modules/settings-write.md) から推定 |

## 前提・状態

- 未接続: `Waiting for device connection...`。ただし page header は存在する。通常の接続条件は共有 app shell に従う。
- unsupported: `zmk__settings` がなければ module 導入案内を表示する。一方 Danger Zone は接続中なら core protocol のため settings subsystem 非対応でも表示する。
- loading: 初回に `Loading settings...`、Reload 中は spinner。`getAllActivitySettings` の値は notification で収集する。
- ready: `sourceId === 0` の Central の timeout を編集でき、全 source の現在値を読み取り表示する。
- queued / saving / saved / error: timeout は 1,500 ms debounce 後の write-through。`Saving...`、成功後最大約 2 秒の `Saved`、hook error を表示する。これは Advanced custom setting の RAM → Save 契約とは異なる。

## 現行の機能仕様

| ID      | 前提 → 操作                                                           | 観測できる結果                                                                                                              | 保存範囲・副作用                                                                                             | 根拠  |
| ------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| SET-001 | settings RPC ready → page 初回表示 / `Reload`                         | `getAllActivitySettings` の notifications を約 500 ms 収集し、Central と peripheral の値を表示。Reload 後に version capture | 読込み。未送信 debounce を flush / cancel する処理はない                                                     | S1/S2 |
| SET-002 | `Idle Timeout` または `Sleep Timeout` を preset / custom 値へ変更     | UI は直ちに pending 値を表示し、約 1,500 ms quiet 後に `Saving...`                                                          | Central の `setActivitySettings` RPC。0 は timeout 無効、値は 0..4294967295 の整数                           | S1–S3 |
| SET-003 | timeout write 成功                                                    | settings を再読込し、約 2 秒 `Saved` を表示                                                                                 | core settings RPC の write-through。Discard / per-timeout Reset はない                                       | S1/S2 |
| SET-004 | timeout 値が範囲外または RPC が失敗                                   | page alert に error。pending は write 終了時に消える                                                                        | エラー後に自動 rollback を保証しない。Reload で実デバイス値を再確認する                                      | S1/S2 |
| SET-005 | `Advanced Settings` を最初に展開                                      | custom settings を lazy-load。以後に閉じて再展開しても単に展開状態を替える                                                  | custom setting の edit / Save / Discard / Reset は [settings write](../modules/settings-write.md)            | S5    |
| SET-006 | Danger Zone または Versions の `Reset all settings` → dialog → Cancel | dialog が閉じ、reset RPC は送らない                                                                                         | 変更なし                                                                                                     | S1    |
| SET-007 | reset dialog → `Reset all settings`                                   | busy 中は Cancel / close / confirm を無効化。成功時に dialog を閉じる                                                       | keymap と custom settings を含む保存済み設定を firmware default へ戻す要求。不可逆、再起動・反映時期は未保証 | S1/S4 |

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

## 不変条件

- SET-I01: timeout の debounce は最後に queue した idle/sleep の組を一回だけ送る。表示だけを成功や flash 永続化と見なさない（S1–S3）。
- SET-I02: 編集フォームの基準値は `sourceId === 0` だが、peripheral 別の編集・隔離を保証しない。set RPC の `source: 0` は対象指定に使われないため、変更後は全 source の値を再取得して確認する（S1/S2）。
- SET-I03: factory reset は confirmation 前、または Cancel / dialog close だけでは送信しない。busy 中の close/cancel を受け付けない（S1）。
- SET-I04: Advanced custom settings のメモリ書込みと core activity settings の write-through を同じ Save / Discard 意味として扱わない（S1/S5）。

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
