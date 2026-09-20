# Import/Export

## 範囲・根拠

`/import-export` の Keyboard Abyss 連携（認証、接続中 keyboard の明示 read、アップロード、書込み前 preview/confirm）を対象にする。tab と standalone route の接続 gate は[共通画面](../modules/app-shell.md)、キー binding の編集は[共通 binding editor](../modules/binding-editor.md)の契約であり、本ページはそれらを再定義しない。コード確認: 2026-09-20、`8627e4d`。UI 実測は未実施。

| 根拠 | ソース / symbol                                                                                                                                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [App](../../../src/App.tsx): `getTabs`, `AppContent`                                                                                                                                                                                                                                                                   |
| S2   | [ImportExportPage](../../../src/pages/ImportExportPage.tsx): `ImportExportPage`, `IMPORT_EXPORT_TAB_ID`                                                                                                                                                                                                                |
| S3   | [Abyss config](../../../src/lib/abyss/abyssConfig.ts): `isAbyssTabVisible`, `isAbyssConfigured`                                                                                                                                                                                                                        |
| S4   | [auth/device/export/import hooks](../../../src/hooks/useAbyssAuth.ts), [useAbyssDevice](../../../src/hooks/useAbyssDevice.ts), [useAbyssExport](../../../src/hooks/useAbyssExport.ts), [useAbyssImport](../../../src/hooks/useAbyssImport.ts), [Abyss client](../../../src/lib/abyss/abyssClient.ts): `getAbyssClient` |
| S5   | [section UI](../../../src/components/importExport/ExportSection.tsx), [ImportSection](../../../src/components/importExport/ImportSection.tsx), [DeviceSnapshotCard](../../../src/components/importExport/DeviceSnapshotCard.tsx)                                                                                       |
| S6   | [page/hook tests](../../../src/pages/__tests__/ImportExportPage.test.tsx), [export tests](../../../src/hooks/__tests__/useAbyssExport.test.tsx), [import tests](../../../src/hooks/__tests__/useAbyssImport.test.tsx)                                                                                                  |

## 機能要求

| ID     | できるべきこと                                                                                      | 出典・確度     |
| ------ | --------------------------------------------------------------------------------------------------- | -------------- |
| IE-R01 | 認証済み利用者が、接続 keyboard の明示的 read に基づき、Abyss へ必要な section だけを export できる | S2/S4 から推定 |
| IE-R02 | keyboard を変える import は、対象・差分・互換性検査を確認してから明示確認で実行できる               | S4/S5 から推定 |
| IE-R03 | OAuth、一覧、read、書込みの失敗または取消を成功・永続化済みと誤認しない                             | S4/S5 から推定 |

## 前提・状態

通常 tab なので接続中だけ app shell に表示する。`isAbyssTabVisible()` は local development なら client ID なしでも表示し、deployed build は client ID がある時だけ登録する。表示されても `isAbyssConfigured()` が false なら sign-in は設定不足として利用不能である。認証済み後も最初は snapshot `idle` で export/import は `Read keyboard` が完了するまで無効である。

| 状態                                              | 可用性 / 見分け方                                                       | 保存・復帰                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| signed out / loading / auth error                 | Account card の sign-in、spinner、`SectionError`。下位 section は非表示 | token/profile は Abyss client の sessionStorage。401 は token を消し再 sign-in を促す        |
| snapshot reading / resolving / done / error       | `Read keyboard`、Bluetooth では遅い旨、layout matching、error           | read は自動実行しない。最後の成功 snapshot は hook state に残る                              |
| export new/update                                 | name/visibility または既存 keymap 選択、section selector、preview       | export は keyboard を書かず、Abyss record/version を作成・更新する                           |
| import loading/preview/blocked/confirming/writing | candidate 選択、filtered diff、preflight、inline confirm                | write 前 Cancel は confirm を閉じるだけ。write は keyboard と adapter の save 経路を変更する |

## 現行の機能仕様

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID     | 前提 → 操作                                                               | 観測できる結果                                                                                   | 保存範囲・副作用                                                                                   | 根拠     |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------- |
| IE-001 | local dev または configured deployed build → Import/Export tab            | tab が現れる。未接続では app shell の接続 gate に従う                                            | tab 登録のみ。資格情報の有無と tab 可視性は別                                                      | S1/S3    |
| IE-002 | signed out → `Sign in with Abyss`                                         | popup を開始し、profile 読取後に account と Export/Import tabs を表示                            | PKCE/token は client の sessionStorage。popup cancel は `Abyss login was cancelled.`               | S2/S4/S6 |
| IE-003 | authenticated → `Read keyboard` / `Read again`                            | read→layout resolve の進捗、layer/key/combo/macro/module 数と catalog verdict を表示             | keyboard RPC の読取り。export/import は同じ `loaded` snapshot を使う                               | S4/S5    |
| IE-004 | Export → new                                                              | 非空 name、visibility、選択 section、upload JSON preview を選べる。new は keymap section を強制  | `createKeymap` または catalog 未一致時 `importKeymap`。keyboard への write なし                    | S4/S5    |
| IE-005 | Export → update → existing keymap                                         | 最新更新 keymap を初期選択し、visual/JSON diff の `Review changes` を開ける                      | merge base を取得し `updateKeymap`。成功時 `Saved to Abyss as version …` と外部 link               | S4/S5    |
| IE-006 | Import → keymap 選択 → section を絞る                                     | full record を取得し、keyboard current→Abyss target の filtered diff、JSON/visual preview を表示 | 選択自体は keyboard を書かない。選択変更は以前の成功表示/error を初期化                            | S4/S5    |
| IE-007 | import diff があり blocked preflight なし → `Write to keyboard` → confirm | 変更数と不可逆警告を表示。`Cancel` は confirm を閉じ、`Write to keyboard` だけが write を呼ぶ    | adapter が差分を書き、完了後 read。`didWrite` は「再 read を呼んだ」ことを示し空 diff の再判定は別 | S4/S5    |
| IE-008 | import target と filtered diff が同一                                     | `The keyboard already matches this keymap.`。primary write は無効                                | keyboard/Abyss とも変更しない                                                                      | S4/S5    |
| IE-009 | authenticated → `Sign out`                                                | profile と Export/Import section を隠し sign-in card に戻る                                      | revoke は best effort 後に token を clear。revoke failure でも local token は残さない              | S4/S5    |
| IE-010 | authenticated → `Export`/`Import` tab を切替                              | 一度に片方だけ表示する。切替は export/import hook state を破棄しない                             | page-local `direction` state の変更のみ。Abyss/keyboard write はしない                             | S2       |

## 代表ユーザーフロー

1. configured build で接続し Import/Export を開く。sign out では sign-in card だけで `Export`/`Import` section が出ないことを確認する（IE-001/002）。
2. sign-in 後 `Read keyboard` を一度だけ押し、reading/resolving の文言が完了して snapshot 数値と layout verdict が出るまで待つ（IE-003）。
3. Export/new で name と visibility を選び JSON preview を確認して export する。成功 version/link を記録し、keyboard の設定を変更しないことは実機で別途確認する（IE-004）。
4. Import で別 keymap と対象 sections を選び、preflight、visual diff、`Review changes as JSON` を確認する（IE-006）。`Write to keyboard` 後は `Cancel` して、write を開始しないことを確認する（IE-007）。
5. 再度 confirm して write し、read 後の結果・error を記録する。途中失敗時は混在状態の可能性があるため再 read して diff を確認する（IE-007）。

## 不変条件

- IE-I01: read 前、または read 中に export/import は開始できない（S4/S5）。
- IE-I02: export は keyboard write API を呼ばない。Abyss 側の新 version 作成は keyboard の flash 保存成功を意味しない（S4）。
- IE-I03: import の Cancel、preview dialog close、section selector は write を呼ばない（S5）。
- IE-I04: import の blocked preflight は confirm button を有効化しない（S4/S5）。

## エラーと復帰

auth/profile/list/read/export/import の hook error は `SectionError` に残り、同じ read・選択・export・write 操作で再試行できる。401 は token を clear するため次回は再認証が必要。locked device は unlock wrapper を通すが、adapter が一部書込後に失敗した場合の原子 rollback はない。full actual write の device flash/RAM 境界は外部 adapter の実装も必要で、本仕様では完了表示を flash 永続化の証拠にしない。

## 探索の観点

- dev credentialなし、deployed credentialなし、configured build を比較し tab/sign-in の差を確認する。
- popup block、popup を閉じる、401、network failure、Abyss keymap list empty/error を分ける。
- BLE と USB で read を連打し、共有 `inFlight` が二重 read を作らないか確認する。
- section の部分 export/import、layout/key/layer count mismatch、write の途中 disconnect を確認する。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

OAuth provider の実接続、Abyss catalog/adapter の server-side version retention、popup blocker fallback、実機の preflight と途中 failure は UI 実測していない。`didWrite` のコメントと異なり実装は read 成功後に diff が空であることを再確認していないため、成功ラベルを完全同期の証明にはしない。
